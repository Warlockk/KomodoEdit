(function() {
    const log       = require("ko/logging").getLogger("commando-scope-files")
    const commando  = require("commando/commando");
    const {Cc, Ci}  = require("chrome");

    const scope     = Cc["@activestate.com/commando/koScopeFiles;1"].getService(Ci.koIScopeFiles);
    const partSvc   = Cc["@activestate.com/koPartService;1"].getService(Ci.koIPartService);
    const ioService = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);

    //log.setLevel(require("ko/logging").LOG_DEBUG);
    var activeUuid = null;

    this.onSearch = function(query, uuid)
    {
        log.debug(uuid + " - Starting Scoped Search");

        activeUuid = uuid;

        var opts = {
            "maxresults": ko.prefs.getLong("commando_search_max_results", 50)
        }

        // Detect directory to search in
        var curProject = partSvc.currentProject;
        var subscope = commando.getSubscope();
        if ( ! subscope && curProject)
        {
            subscope = {label: curProject.name.split(".")[0], path: curProject.liveDirectory};
        }
        else if ( ! subscope)
        {
            var placesPath = ioService.newURI(ko.places.getDirectory(), null, null).path;
            subscope = {label: placesPath, path: placesPath};
            if (subscope.label.length > 15)
                subscope.label = ".." + subscope.label.substr(-15);
        }
        commando.setSubscope(subscope);

        // Set includes/excludes, if relevant
        if (curProject && subscope.path.indexOf(curProject.liveDirectory) === 0)
        {
            opts["excludes"] = curProject.prefset.getString("import_exclude_matches");
            opts["includes"] = curProject.prefset.getString("import_include_matches");

            opts["excludes"] = opts["excludes"] == "" ? [] : opts["excludes"].split(";");
            opts["includes"] = opts["includes"] == "" ? [] : opts["includes"].split(";");
        }
        opts = JSON.stringify(opts);
        log.debug(uuid + " - Opts: " + opts);

        scope.search(query, subscope.path, opts, function(status, entry)
        {
            if (activeUuid != uuid)
            {
                log.debug(uuid + " - No longer the active search, don't pass result");
                return; // Don't waste any more time on past search queries
            }
            
            if (entry == "done") // search complete
            {
                commando.onSearchComplete("scope-files", uuid);
                return;
            }

            var [name, path, type, depth, description] = entry;
            commando.renderResult({
                id: path,
                name: name,
                description: description,
                icon: "moz-icon://" + path + "?size=32",
                isScope: type == 'dir',
                weight: depth
            }, uuid);
        });
    }

    this.onSelectResult = function(selectedItems)
    {
        //ko.open.multipleURIs([]);
    }

}).apply(module.exports);
