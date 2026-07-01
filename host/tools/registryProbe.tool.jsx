(function () {
    if (typeof AEToolbox === "undefined" || !AEToolbox.registerTool) {
        return;
    }

    AEToolbox.tools = AEToolbox.tools || {};
    AEToolbox.tools.registryProbe = AEToolbox.tools.registryProbe || {};

    AEToolbox.tools.registryProbe.inspect = function (paramsJson) {
        var comp = AEToolbox.AE.getActiveComp();
        var selectedCount = 0;
        var compName = "";

        if (comp) {
            compName = comp.name;
            selectedCount = comp.selectedLayers ? comp.selectedLayers.length : 0;
        }

        return AEToolbox.stringify({
            ok: true,
            messageKey: "tools.registryProbe.messages.ready",
            compName: compName,
            selectedCount: selectedCount,
            message: comp ? "Registry Probe ready." : "Registry Probe ready. No active comp."
        });
    };

    AEToolbox.registerTool({
        id: "registryProbe",
        titleKey: "tools.registryProbe.title",
        descriptionKey: "tools.registryProbe.description",
        category: "debug",
        iconText: "R",
        uiSchema: [
            {
                type: "text",
                key: "note",
                labelKey: "tools.registryProbe.fields.note",
                defaultValue: "phase-1"
            },
            {
                type: "checkbox",
                key: "includeSelection",
                labelKey: "tools.registryProbe.fields.includeSelection",
                defaultValue: true
            }
        ],
        actions: [
            {
                id: "inspect",
                labelKey: "tools.registryProbe.actions.inspect",
                hostFunction: "AEToolbox.tools.registryProbe.inspect",
                style: "primary"
            }
        ],
        i18n: {
            en: {
                "tools.registryProbe.title": "Registry Probe",
                "tools.registryProbe.description": "Test dynamic .tool.jsx registration and host communication.",
                "tools.registryProbe.fields.note": "Note",
                "tools.registryProbe.fields.includeSelection": "Include selection count",
                "tools.registryProbe.actions.inspect": "Inspect Active Comp",
                "tools.registryProbe.messages.ready": "Registry Probe: {compName} / {selectedCount} selected layer(s)."
            },
            "zh-CN": {
                "tools.registryProbe.title": "\u6ce8\u518c\u8868\u63a2\u9488",
                "tools.registryProbe.description": "\u6d4b\u8bd5\u52a8\u6001 .tool.jsx \u6ce8\u518c\u548c host \u901a\u4fe1\u3002",
                "tools.registryProbe.fields.note": "\u5907\u6ce8",
                "tools.registryProbe.fields.includeSelection": "\u5305\u542b\u9009\u62e9\u6570\u91cf",
                "tools.registryProbe.actions.inspect": "\u68c0\u67e5\u5f53\u524d\u5408\u6210",
                "tools.registryProbe.messages.ready": "\u6ce8\u518c\u8868\u63a2\u9488\uff1a{compName} / \u5df2\u9009 {selectedCount} \u4e2a\u56fe\u5c42\u3002"
            }
        }
    });
})();
