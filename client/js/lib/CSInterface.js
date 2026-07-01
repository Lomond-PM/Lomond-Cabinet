/* Minimal CEP CSInterface implementation for AE Toolbox. */
(function () {
    "use strict";

    window.SystemPath = {
        USER_DATA: "userData",
        COMMON_FILES: "commonFiles",
        MY_DOCUMENTS: "myDocuments",
        APPLICATION: "application",
        EXTENSION: "extension",
        HOST_APPLICATION: "hostApplication"
    };

    function CSInterface() {}

    CSInterface.prototype.evalScript = function (script, callback) {
        if (window.__adobe_cep__ && window.__adobe_cep__.evalScript) {
            window.__adobe_cep__.evalScript(script, callback || function () {});
        } else if (callback) {
            callback("");
        }
    };

    CSInterface.prototype.getSystemPath = function (pathType) {
        if (window.__adobe_cep__ && window.__adobe_cep__.getSystemPath) {
            return window.__adobe_cep__.getSystemPath(pathType);
        }
        return "";
    };

    CSInterface.prototype.getHostEnvironment = function () {
        if (window.__adobe_cep__ && window.__adobe_cep__.getHostEnvironment) {
            return JSON.parse(window.__adobe_cep__.getHostEnvironment());
        }
        return {};
    };

    window.CSInterface = CSInterface;
})();

