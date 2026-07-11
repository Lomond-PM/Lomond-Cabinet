(function () {
    "use strict";

    var STORAGE_KEY = "aeToolbox.language";
    var warnedKeys = {};

    /*
     * i18n extension rules:
     * - Registry tool strings belong in the matching host/tools/*.tool.jsx i18n block.
     * - New user-visible strings must be added to the dictionaries below.
     * - Do not hard-code user-visible text in HTML or main.js; use data-i18n or I18n.t(...).
     * - Host JSX should return messageKey when practical; the client falls back to message.
     */
    var I18n = {
        currentLanguage: "en",
        dictionaries: {
            en: {
                "app.title": "Lomond Cabinet",

                "common.home": "Home",
                "common.back": "Back",
                "common.done": "Done",
                "common.editHome": "Edit Home",
                "common.settings": "Settings",
                "common.global": "Global",
                "common.language": "Language",
                "common.apply": "Apply",
                "common.create": "Create",
                "common.refresh": "Refresh",
                "common.reset": "Reset",
                "common.resetDefaults": "Reset Defaults",
                "common.restoreDefaults": "Restore Defaults",
                "common.valuesReset": "Values reset to defaults.",
                "common.saved": "Saved",
                "common.cancel": "Cancel",
                "common.ready": "Ready",
                "common.error": "Error",
                "common.unavailable": "Unavailable",
                "common.none": "None",
                "common.solid": "Solid",
                "common.gradient": "Gradient",
                "common.enabled": "Enabled",
                "common.disabled": "Disabled",
                "common.auto": "Auto",
                "common.fixed": "Fixed",
                "common.left": "Left",
                "common.center": "Center",
                "common.right": "Right",
                "common.timeline": "Timeline",
                "common.yPosition": "Y Position",
                "common.xPosition": "X Position",
                "common.rowMajor": "Row-Major",
                "common.fitBox": "Fit Box",
                "common.uniformHeight": "Uniform Height",
                "common.uniformWidth": "Uniform Width",
                "common.registry": "Registry",
                "common.parameters": "Parameters",

                "tools.moreTools.title": "More Tools",
                "tools.quickStack.title": "Quick Stack",

                "section.geometry": "Geometry",
                "section.bounds": "Bounds",
                "section.fill": "Fill",
                "section.surface": "Surface",
                "section.stroke": "Stroke",
                "section.outline": "Outline",
                "section.selection": "Selection",
                "section.layerInfo": "Layer Info",
                "section.contentsAdd": "Contents Add",
                "section.nativeShapeItems": "Native shape items",
                "section.defaults": "Defaults",
                "section.strokeFillDefaults": "Stroke / Fill defaults",
                "section.trimPaths": "Trim Paths",
                "section.strokeTaper": "Stroke Taper",
                "section.motion": "Motion",
                "section.animation": "Animation",
                "section.color": "Color",
                "section.theme": "Theme",
                "section.debug": "Debug",
                "section.developerTools": "Developer Tools",
                "section.procedural": "Procedural",
                "section.backgroundEngine": "Background Engine",
                "section.shape": "Shape",
                "paletteLibrary.title": "Palette Library",
                "paletteLibrary.description": "Edit curated procedural palettes, custom palettes, and Home tool color assignments.",
                "paletteLibrary.builtIn": "Built-in",
                "paletteLibrary.custom": "Custom",
                "paletteLibrary.modified": "Modified",
                "paletteLibrary.displayName": "Display name",
                "paletteLibrary.shadow": "Shadow",
                "paletteLibrary.base": "Base",
                "paletteLibrary.secondary": "Secondary",
                "paletteLibrary.highlight": "Highlight",
                "paletteLibrary.stop1": "Stop 1",
                "paletteLibrary.stop2": "Stop 2",
                "paletteLibrary.stop3": "Stop 3",
                "paletteLibrary.stop4": "Stop 4",
                "paletteLibrary.weight.shadow": "Shadow weight",
                "paletteLibrary.weight.base": "Base weight",
                "paletteLibrary.weight.secondary": "Secondary weight",
                "paletteLibrary.weight.highlight": "Highlight weight",
                "paletteLibrary.new": "New Palette",
                "paletteLibrary.duplicate": "Duplicate",
                "paletteLibrary.duplicatePalette": "Duplicate Palette",
                "paletteLibrary.delete": "Delete",
                "paletteLibrary.hide": "Hide",
                "paletteLibrary.show": "Show",
                "paletteLibrary.restoreDefaults": "Restore Defaults",
                "paletteLibrary.import": "Import",
                "paletteLibrary.export": "Export",
                "paletteLibrary.replace": "Replace",
                "paletteLibrary.merge": "Merge",
                "paletteLibrary.invalidPalette": "Invalid Palette",
                "paletteLibrary.paletteInUse": "Palette In Use",
                "paletteLibrary.unsavedChanges": "Unsaved Changes",
                "paletteLibrary.saved": "Saved",
                "paletteLibrary.save": "Save",
                "paletteLibrary.cancel": "Cancel",
                "paletteLibrary.saveAndContinue": "Save and Continue",
                "paletteLibrary.discardChanges": "Discard Changes",
                "paletteLibrary.open": "Open Palette Library",
                "paletteLibrary.backToSettings": "Back to Settings",
                "paletteLibrary.resizePaletteList": "Resize Palette List",
                "paletteLibrary.deletePalette": "Delete Palette",
                "paletteLibrary.deleteConfirmation": "Delete {name}? This palette is used by {count} tools.",
                "paletteLibrary.paletteDeleted": "Palette deleted",
                "paletteLibrary.exportConfiguration": "Export Palette Configuration",
                "paletteLibrary.exportDescription": "Export custom palettes, built-in overrides, and Home tool assignments for backup or migration.",
                "paletteLibrary.exportResult": "Export Result",
                "paletteLibrary.generateJson": "Generate JSON",
                "paletteLibrary.copyJson": "Copy Export JSON",
                "paletteLibrary.exportCopied": "Export Copied",
                "paletteLibrary.importConfiguration": "Import Palette Configuration",
                "paletteLibrary.importDescription": "Paste previously exported JSON, then merge it with or replace the current user configuration.",
                "paletteLibrary.importInput": "Paste Import JSON",
                "paletteLibrary.pasteJsonPlaceholder": "Paste exported palette JSON here",
                "paletteLibrary.validate": "Validate",
                "paletteLibrary.jsonValid": "JSON is valid",
                "paletteLibrary.mergeImport": "Merge Import",
                "paletteLibrary.replaceImport": "Replace Import",
                "paletteLibrary.replaceConfirmation": "Replace all custom palettes, built-in overrides, and Home assignments? Factory palettes remain available.",
                "paletteLibrary.clear": "Clear",
                "paletteLibrary.invalidJson": "Invalid JSON",
                "paletteLibrary.importSuccessful": "Import Successful",
                "paletteLibrary.toolMapping": "Home tool palette mapping",
                "paletteLibrary.importExport": "Import / Export JSON",
                "paletteLibrary.tool.shapeAdd": "Shape Add",
                "paletteLibrary.tool.textBackgroundBox": "Text Background Box",
                "paletteLibrary.tool.selectionInfo": "Selection Info",
                "paletteLibrary.tool.ecommerceLayout": "Ad Component Kit",
                "paletteLibrary.tool.proceduralAppearanceLab": "Procedural Appearance Lab",
                "paletteLibrary.tool.registryControlLab": "Registry Control Lab",
                "paletteLibrary.tool.settingsRendererLab": "Settings Renderer Lab",

                "label.paddingX": "Padding X",
                "label.paddingY": "Padding Y",
                "label.roundness": "Roundness",
                "label.fillColor": "Fill Color",
                "label.fillOpacity": "Fill Opacity",
                "label.strokeColor": "Stroke Color",
                "label.strokeWidth": "Stroke Width",
                "label.miterLimit": "Miter Limit",
                "label.strokeOpacity": "Stroke Opacity",
                "label.autoSelectionStatus": "Auto selection status",
                "label.registryDebugTools": "Developer Mode",
                "label.homeIconRadius": "Home icon radius",
                "label.homeDragShadowIntensity": "Home drag shadow",
                "label.strokeFillLayer": "New Stroke / Fill Shape Layer",
                "label.trimStart": "Trim Start",
                "label.trimEnd": "Trim End",
                "label.trimOffset": "Trim Offset",
                "label.startLength": "Start Length",
                "label.endLength": "End Length",
                "label.startWidth": "Start Width",
                "label.endWidth": "End Width",
                "label.startEase": "Start Ease",
                "label.endEase": "End Ease",
                "label.motionSpeed": "Motion speed",
                "label.uiScale": "UI scale",
                "label.accentColor": "Accent color",
                "label.homeBackground": "Home background",
                "label.toolIconColor": "Tool icon color",
                "label.toolIconLine": "Tool icon line",
                "label.preset": "Preset",
                "label.background": "Background",
                "label.secondary": "Secondary",
                "label.accent": "Accent",
                "label.accent2": "Accent 2",
                "label.line": "Line",
                "label.glow": "Glow",
                "label.glowIntensity": "Glow Intensity",
                "label.glowSize": "Glow Size",
                "label.glowX": "Glow X",
                "label.glowY": "Glow Y",
                "label.gridOpacity": "Grid Opacity",
                "label.gridSize": "Grid Size",
                "label.lineOpacity": "Line Opacity",
                "label.ringOpacity": "Ring Opacity",
                "label.ringScale": "Ring Scale",
                "label.accentAngle": "Accent Angle",
                "label.patternDensity": "Pattern Density",
                "label.contrast": "Contrast",
                "label.enableMotion": "Enable Motion",
                "label.motionAmount": "Motion Amount",
                "label.gap": "Gap",
                "label.cornerRadius": "Corner Radius",
                "label.pillWidthMode": "Pill Width Mode",
                "label.fixedWidth": "Fixed Width",
                "label.gradientEnable": "Gradient Enable",
                "label.textAlign": "Text Align",
                "label.sort": "Sort",
                "label.columns": "Columns",
                "label.normalizeMode": "Normalize Mode",
                "label.targetWidth": "Target Width",
                "label.targetHeight": "Target Height",
                "label.cellWidth": "Cell Width",
                "label.cellHeight": "Cell Height",
                "label.gapX": "Gap X",
                "label.gapY": "Gap Y",
                "label.lastRowAlign": "Last Row Align",

                "helper.autoSelectionStatus": "Refresh selected text layer count while the panel is open.",
                "helper.motionSpeed": "Adjust panel transitions. 1.00 is balanced.",
                "helper.uiScale": "Adjust text and control density for narrow panels.",
                "helper.accentColor": "Used selectively for highlights, borders, and primary actions.",
                "helper.homeBackground": "Sets the main panel and Home surface color.",
                "helper.toolIconColor": "Adjusts the app icon plate color.",
                "helper.toolIconLine": "Adjusts the symbol line color inside tool icons.",
                "helper.registryDebugTools": "Show debug, probe, and lab registry tools for development testing.",
                "helper.homeIconRadius": "Developer-only proportional radius for Home tool icons and matching square previews.",
                "helper.homeDragShadowIntensity": "Developer-only intensity for the soft shadow shown under the currently dragged Home icon.",
                "helper.preset": "Start from a designed procedural look.",
                "helper.enableMotion": "Uses slow opacity and transform only.",
                "settings.backgroundPreset.custom": "Custom",
                "settings.backgroundPreset.blackGold": "Black Gold Default",
                "settings.backgroundPreset.solarGrid": "Solar Grid",
                "settings.backgroundPreset.obsidianRings": "Obsidian Rings",
                "settings.backgroundPreset.midnightBlueprint": "Midnight Blueprint",
                "settings.backgroundPreset.minimalDark": "Minimal Dark",
                "helper.refreshSelectionPrompt": "Click Refresh Selection to inspect the current comp selection.",
                "button.createBackgroundBox": "Create Rounded Rectangle",
                "button.refreshSelection": "Refresh Selection",
                "button.randomize": "Randomize",
                "button.resetDefaults": "Reset Defaults",

                "status.ready": "Ready",
                "status.readyPeriod": "Ready.",
                "status.loadingHost": "Loading host JSX...",
                "status.hostLoading": "Host JSX is still loading...",
                "status.hostLoadError": "Error: host JSX did not load. Check host/index.jsx includes.",
                "status.noActiveComp": "No active composition",
                "status.openComp": "Please open a composition",
                "status.noLayer": "Please select at least one layer",
                "status.noTextLayer": "Please select at least one text layer",
                "status.selectShapeLayer": "Please select a shape layer",
                "status.createdItems": "Created {count} item(s)",
                "status.createdBackgroundBoxes": "Created {count} background rounded rectangle(s)",
                "status.createdStrokeFillLayer": "Created Stroke / Fill shape layer",
                "status.creatingBackgroundBox": "Creating rounded rectangles...",
                "status.creatingStrokeFillLayer": "Creating Stroke / Fill shape layer...",
                "status.selectionUpdated": "Selection info updated.",
                "status.readingSelection": "Reading selection...",
                "status.noResponse": "No response from After Effects.",
                "status.colorPickerOpening": "Opening AE color picker...",
                "status.colorUpdated": "Color updated.",
                "status.colorUnchanged": "Color unchanged.",
                "status.defaultsRestored": "Defaults restored.",
                "status.motionSpeedUpdated": "Motion speed updated.",
                "status.backgroundRandomized": "Background randomized.",
                "status.backgroundDefaultsRestored": "Background defaults restored.",
                "status.homeEditing": "Home editing. Drag tools to reorder.",
                "status.homeLayoutSaved": "Home layout saved.",
                "status.addingShape": "Adding {label}...",
                "status.addedShape": "Added: {label}",
                "status.noSelectedLayers": "No selected layers.",
                "status.unableReadSelection": "Unable to read selection.",

                "selection.noSelection": "No selection",
                "selection.noShapeTarget": "No shape target",
                "selection.shapeTarget": "Shape target",
                "selection.layerCount": "{count} layer(s)"
            },
            "zh-CN": {
                "app.title": "Lomond Cabinet",

                "common.home": "\u4e3b\u9875",
                "common.back": "\u8fd4\u56de",
                "common.done": "\u5b8c\u6210",
                "common.editHome": "\u7f16\u8f91\u4e3b\u9875",
                "common.settings": "\u8bbe\u7f6e",
                "common.global": "\u5168\u5c40",
                "common.language": "\u8bed\u8a00",
                "common.apply": "\u5e94\u7528",
                "common.create": "\u521b\u5efa",
                "common.refresh": "\u5237\u65b0",
                "common.reset": "\u91cd\u7f6e",
                "common.resetDefaults": "\u6062\u590d\u9ed8\u8ba4\u503c",
                "common.restoreDefaults": "\u6062\u590d\u9ed8\u8ba4",
                "common.valuesReset": "\u5df2\u6062\u590d\u9ed8\u8ba4\u503c\u3002",
                "common.saved": "\u5df2\u4fdd\u5b58",
                "common.cancel": "\u53d6\u6d88",
                "common.ready": "\u5c31\u7eea",
                "common.error": "\u9519\u8bef",
                "common.unavailable": "\u4e0d\u53ef\u7528",
                "common.none": "\u65e0",
                "common.solid": "\u7eaf\u8272",
                "common.gradient": "\u6e10\u53d8",
                "common.enabled": "\u542f\u7528",
                "common.disabled": "\u7981\u7528",
                "common.auto": "\u81ea\u52a8",
                "common.fixed": "\u56fa\u5b9a",
                "common.left": "\u5de6\u5bf9\u9f50",
                "common.center": "\u5c45\u4e2d",
                "common.right": "\u53f3\u5bf9\u9f50",
                "common.timeline": "\u65f6\u95f4\u7ebf",
                "common.yPosition": "Y \u4f4d\u7f6e",
                "common.xPosition": "X \u4f4d\u7f6e",
                "common.rowMajor": "\u884c\u4f18\u5148",
                "common.fitBox": "\u9002\u914d\u6846",
                "common.uniformHeight": "\u7edf\u4e00\u9ad8\u5ea6",
                "common.uniformWidth": "\u7edf\u4e00\u5bbd\u5ea6",
                "common.registry": "\u6ce8\u518c\u4fe1\u606f",
                "common.parameters": "\u53c2\u6570",

                "tools.moreTools.title": "\u66f4\u591a\u5de5\u5177",
                "tools.quickStack.title": "\u5feb\u901f\u5806\u53e0",

                "section.geometry": "\u51e0\u4f55",
                "section.bounds": "\u8fb9\u754c",
                "section.fill": "\u586b\u5145",
                "section.surface": "\u8868\u9762",
                "section.stroke": "\u63cf\u8fb9",
                "section.outline": "\u8f6e\u5ed3",
                "section.selection": "\u9009\u62e9",
                "section.layerInfo": "\u56fe\u5c42\u4fe1\u606f",
                "section.contentsAdd": "\u5185\u5bb9\u6dfb\u52a0",
                "section.nativeShapeItems": "\u539f\u751f\u5f62\u72b6\u5143\u7d20",
                "section.defaults": "\u9ed8\u8ba4\u503c",
                "section.strokeFillDefaults": "Stroke / Fill \u9ed8\u8ba4\u503c",
                "section.trimPaths": "\u4fee\u526a\u8def\u5f84",
                "section.strokeTaper": "\u63cf\u8fb9\u9525\u5ea6",
                "section.motion": "\u52a8\u6548",
                "section.animation": "\u52a8\u753b",
                "section.color": "\u989c\u8272",
                "section.theme": "\u4e3b\u9898",
                "section.debug": "\u8c03\u8bd5",
                "section.developerTools": "\u5f00\u53d1\u8005\u5de5\u5177",
                "section.procedural": "\u7a0b\u5e8f\u5316",
                "section.backgroundEngine": "\u80cc\u666f\u5f15\u64ce",
                "section.shape": "\u5f62\u72b6",
                "paletteLibrary.title": "\u8272\u5361\u5e93",
                "paletteLibrary.description": "\u7f16\u8f91\u7a0b\u5e8f\u5316\u7cbe\u9009\u8272\u5361\u3001\u81ea\u5b9a\u4e49\u8272\u5361\u548c Home \u5de5\u5177\u914d\u8272\u5206\u914d\u3002",
                "paletteLibrary.builtIn": "\u5185\u7f6e",
                "paletteLibrary.custom": "\u81ea\u5b9a\u4e49",
                "paletteLibrary.modified": "\u5df2\u4fee\u6539",
                "paletteLibrary.displayName": "\u663e\u793a\u540d\u79f0",
                "paletteLibrary.shadow": "\u9634\u5f71",
                "paletteLibrary.base": "\u4e3b\u8272",
                "paletteLibrary.secondary": "\u8f85\u8272",
                "paletteLibrary.highlight": "\u9ad8\u5149",
                "paletteLibrary.stop1": "\u8272\u6807 1",
                "paletteLibrary.stop2": "\u8272\u6807 2",
                "paletteLibrary.stop3": "\u8272\u6807 3",
                "paletteLibrary.stop4": "\u8272\u6807 4",
                "paletteLibrary.weight.shadow": "\u9634\u5f71\u6743\u91cd",
                "paletteLibrary.weight.base": "\u4e3b\u8272\u6743\u91cd",
                "paletteLibrary.weight.secondary": "\u8f85\u8272\u6743\u91cd",
                "paletteLibrary.weight.highlight": "\u9ad8\u5149\u6743\u91cd",
                "paletteLibrary.new": "\u65b0\u5efa\u8272\u5361",
                "paletteLibrary.duplicate": "\u590d\u5236",
                "paletteLibrary.duplicatePalette": "\u590d\u5236\u8272\u5361",
                "paletteLibrary.delete": "\u5220\u9664",
                "paletteLibrary.hide": "\u9690\u85cf",
                "paletteLibrary.show": "\u663e\u793a",
                "paletteLibrary.restoreDefaults": "\u6062\u590d\u9ed8\u8ba4",
                "paletteLibrary.import": "\u5bfc\u5165",
                "paletteLibrary.export": "\u5bfc\u51fa",
                "paletteLibrary.replace": "\u66ff\u6362",
                "paletteLibrary.merge": "\u5408\u5e76",
                "paletteLibrary.invalidPalette": "\u65e0\u6548\u8272\u5361",
                "paletteLibrary.paletteInUse": "\u8272\u5361\u6b63\u5728\u4f7f\u7528",
                "paletteLibrary.unsavedChanges": "\u672a\u4fdd\u5b58\u66f4\u6539",
                "paletteLibrary.saved": "\u5df2\u4fdd\u5b58",
                "paletteLibrary.save": "\u4fdd\u5b58",
                "paletteLibrary.cancel": "\u53d6\u6d88",
                "paletteLibrary.saveAndContinue": "\u4fdd\u5b58\u5e76\u7ee7\u7eed",
                "paletteLibrary.discardChanges": "\u653e\u5f03\u66f4\u6539",
                "paletteLibrary.open": "\u6253\u5f00\u8272\u5361\u5e93",
                "paletteLibrary.backToSettings": "\u8fd4\u56de\u8bbe\u7f6e",
                "paletteLibrary.resizePaletteList": "\u8c03\u6574\u8272\u5361\u5217\u8868\u5bbd\u5ea6",
                "paletteLibrary.deletePalette": "\u5220\u9664\u8272\u5361",
                "paletteLibrary.deleteConfirmation": "\u5220\u9664 {name}\uff1f\u5f53\u524d\u6709 {count} \u4e2a\u5de5\u5177\u4f7f\u7528\u6b64\u8272\u5361\u3002",
                "paletteLibrary.paletteDeleted": "\u8272\u5361\u5df2\u5220\u9664",
                "paletteLibrary.exportConfiguration": "\u5bfc\u51fa\u8272\u5361\u914d\u7f6e",
                "paletteLibrary.exportDescription": "\u5bfc\u51fa\u81ea\u5b9a\u4e49\u8272\u5361\u3001\u5185\u7f6e\u8272\u5361\u4fee\u6539\u548c Home \u5de5\u5177\u6620\u5c04\uff0c\u7528\u4e8e\u5907\u4efd\u6216\u8fc1\u79fb\u3002",
                "paletteLibrary.exportResult": "\u5bfc\u51fa\u7ed3\u679c",
                "paletteLibrary.generateJson": "\u751f\u6210 JSON",
                "paletteLibrary.copyJson": "\u590d\u5236\u5bfc\u51fa JSON",
                "paletteLibrary.exportCopied": "\u5bfc\u51fa\u5185\u5bb9\u5df2\u590d\u5236",
                "paletteLibrary.importConfiguration": "\u5bfc\u5165\u8272\u5361\u914d\u7f6e",
                "paletteLibrary.importDescription": "\u7c98\u8d34\u4e4b\u524d\u5bfc\u51fa\u7684 JSON\uff0c\u7136\u540e\u9009\u62e9\u5408\u5e76\u6216\u66ff\u6362\u5f53\u524d\u7528\u6237\u914d\u7f6e\u3002",
                "paletteLibrary.importInput": "\u7c98\u8d34\u5bfc\u5165 JSON",
                "paletteLibrary.pasteJsonPlaceholder": "\u5728\u6b64\u7c98\u8d34\u5df2\u5bfc\u51fa\u7684\u8272\u5361 JSON",
                "paletteLibrary.validate": "\u9a8c\u8bc1",
                "paletteLibrary.jsonValid": "JSON \u9a8c\u8bc1\u901a\u8fc7",
                "paletteLibrary.mergeImport": "\u5408\u5e76\u5bfc\u5165",
                "paletteLibrary.replaceImport": "\u66ff\u6362\u5bfc\u5165",
                "paletteLibrary.replaceConfirmation": "\u66ff\u6362\u6240\u6709\u81ea\u5b9a\u4e49\u8272\u5361\u3001\u5185\u7f6e\u8272\u5361\u4fee\u6539\u548c Home \u6620\u5c04\uff1f\u5185\u7f6e\u539f\u59cb\u8272\u5361\u4ecd\u4f1a\u4fdd\u7559\u3002",
                "paletteLibrary.clear": "\u6e05\u7a7a",
                "paletteLibrary.invalidJson": "\u65e0\u6548 JSON",
                "paletteLibrary.importSuccessful": "\u5bfc\u5165\u6210\u529f",
                "paletteLibrary.toolMapping": "Home \u5de5\u5177\u8272\u5361\u6620\u5c04",
                "paletteLibrary.importExport": "\u5bfc\u5165 / \u5bfc\u51fa JSON",
                "paletteLibrary.tool.shapeAdd": "Shape Add",
                "paletteLibrary.tool.textBackgroundBox": "Text Background Box",
                "paletteLibrary.tool.selectionInfo": "Selection Info",
                "paletteLibrary.tool.ecommerceLayout": "Ad Component Kit",
                "paletteLibrary.tool.proceduralAppearanceLab": "\u7a0b\u5e8f\u5316\u5916\u89c2\u5b9e\u9a8c\u5ba4",
                "paletteLibrary.tool.registryControlLab": "\u6ce8\u518c\u5668\u63a7\u5236\u5b9e\u9a8c\u5ba4",
                "paletteLibrary.tool.settingsRendererLab": "Settings Renderer Lab",

                "label.paddingX": "Padding X",
                "label.paddingY": "Padding Y",
                "label.roundness": "\u5706\u89d2",
                "label.fillColor": "\u586b\u5145\u989c\u8272",
                "label.fillOpacity": "\u586b\u5145\u4e0d\u900f\u660e\u5ea6",
                "label.strokeColor": "\u63cf\u8fb9\u989c\u8272",
                "label.strokeWidth": "\u63cf\u8fb9\u5bbd\u5ea6",
                "label.miterLimit": "\u5c16\u89d2\u9650\u5236",
                "label.strokeOpacity": "\u63cf\u8fb9\u4e0d\u900f\u660e\u5ea6",
                "label.autoSelectionStatus": "\u81ea\u52a8\u9009\u62e9\u72b6\u6001",
                "label.registryDebugTools": "\u5f00\u53d1\u8005\u6a21\u5f0f",
                "label.homeIconRadius": "\u4e3b\u9875\u56fe\u6807\u5706\u89d2",
                "label.homeDragShadowIntensity": "\u4e3b\u9875\u62d6\u52a8\u6295\u5f71",
                "label.strokeFillLayer": "\u65b0\u5efa Stroke / Fill \u5f62\u72b6\u56fe\u5c42",
                "label.trimStart": "\u4fee\u526a\u5f00\u59cb",
                "label.trimEnd": "\u4fee\u526a\u7ed3\u675f",
                "label.trimOffset": "\u4fee\u526a\u504f\u79fb",
                "label.startLength": "\u8d77\u59cb\u957f\u5ea6",
                "label.endLength": "\u7ed3\u675f\u957f\u5ea6",
                "label.startWidth": "\u8d77\u59cb\u5bbd\u5ea6",
                "label.endWidth": "\u7ed3\u675f\u5bbd\u5ea6",
                "label.startEase": "\u8d77\u59cb\u7f13\u52a8",
                "label.endEase": "\u7ed3\u675f\u7f13\u52a8",
                "label.motionSpeed": "\u52a8\u753b\u901f\u5ea6",
                "label.uiScale": "UI \u7f29\u653e",
                "label.accentColor": "\u5f3a\u8c03\u8272",
                "label.homeBackground": "\u4e3b\u9875\u80cc\u666f",
                "label.toolIconColor": "\u5de5\u5177\u56fe\u6807\u989c\u8272",
                "label.toolIconLine": "\u5de5\u5177\u56fe\u6807\u7ebf\u6761",
                "label.preset": "\u9884\u8bbe",
                "label.background": "\u80cc\u666f",
                "label.secondary": "\u6b21\u7ea7",
                "label.accent": "\u5f3a\u8c03",
                "label.accent2": "\u5f3a\u8c03 2",
                "label.line": "\u7ebf\u6761",
                "label.glow": "\u5149\u6655",
                "label.glowIntensity": "\u5149\u6655\u5f3a\u5ea6",
                "label.glowSize": "\u5149\u6655\u5c3a\u5bf8",
                "label.glowX": "\u5149\u6655 X",
                "label.glowY": "\u5149\u6655 Y",
                "label.gridOpacity": "\u7f51\u683c\u4e0d\u900f\u660e\u5ea6",
                "label.gridSize": "\u7f51\u683c\u5c3a\u5bf8",
                "label.lineOpacity": "\u7ebf\u6761\u4e0d\u900f\u660e\u5ea6",
                "label.ringOpacity": "\u5706\u73af\u4e0d\u900f\u660e\u5ea6",
                "label.ringScale": "\u5706\u73af\u7f29\u653e",
                "label.accentAngle": "\u5f3a\u8c03\u89d2\u5ea6",
                "label.patternDensity": "\u56fe\u6848\u5bc6\u5ea6",
                "label.contrast": "\u5bf9\u6bd4\u5ea6",
                "label.enableMotion": "\u542f\u7528\u52a8\u6001",
                "label.motionAmount": "\u52a8\u6001\u5e45\u5ea6",
                "label.gap": "\u95f4\u8ddd",
                "label.cornerRadius": "\u8fb9\u89d2\u534a\u5f84",
                "label.pillWidthMode": "\u80f6\u56ca\u5bbd\u5ea6\u6a21\u5f0f",
                "label.fixedWidth": "\u56fa\u5b9a\u5bbd\u5ea6",
                "label.gradientEnable": "\u542f\u7528\u6e10\u53d8",
                "label.textAlign": "\u6587\u672c\u5bf9\u9f50",
                "label.sort": "\u6392\u5e8f",
                "label.columns": "\u5217\u6570",
                "label.normalizeMode": "\u7edf\u4e00\u5c3a\u5bf8\u6a21\u5f0f",
                "label.targetWidth": "\u76ee\u6807\u5bbd\u5ea6",
                "label.targetHeight": "\u76ee\u6807\u9ad8\u5ea6",
                "label.cellWidth": "\u5355\u5143\u683c\u5bbd\u5ea6",
                "label.cellHeight": "\u5355\u5143\u683c\u9ad8\u5ea6",
                "label.gapX": "X \u95f4\u8ddd",
                "label.gapY": "Y \u95f4\u8ddd",
                "label.lastRowAlign": "\u6700\u540e\u4e00\u884c\u5bf9\u9f50",

                "helper.autoSelectionStatus": "\u9762\u677f\u6253\u5f00\u65f6\u5237\u65b0\u9009\u4e2d\u6587\u672c\u5c42\u6570\u91cf\u3002",
                "helper.motionSpeed": "\u8c03\u6574\u9762\u677f\u8fc7\u6e21\u52a8\u753b\u30021.00 \u4e3a\u5e73\u8861\u503c\u3002",
                "helper.uiScale": "\u4e3a\u72ed\u7a84\u9762\u677f\u8c03\u6574\u6587\u5b57\u548c\u63a7\u4ef6\u5bc6\u5ea6\u3002",
                "helper.accentColor": "\u7528\u4e8e\u9ad8\u4eae\u3001\u8fb9\u6846\u548c\u4e3b\u64cd\u4f5c\u3002",
                "helper.homeBackground": "\u8bbe\u7f6e\u4e3b\u9762\u677f\u548c\u4e3b\u9875\u8868\u9762\u989c\u8272\u3002",
                "helper.toolIconColor": "\u8c03\u6574 app \u56fe\u6807\u5e95\u677f\u989c\u8272\u3002",
                "helper.toolIconLine": "\u8c03\u6574\u5de5\u5177\u56fe\u6807\u5185\u7b26\u53f7\u7ebf\u6761\u989c\u8272\u3002",
                "helper.registryDebugTools": "\u663e\u793a\u4ec5\u7528\u4e8e\u5f00\u53d1\u6d4b\u8bd5\u7684 debug\u3001probe \u548c lab registry \u5de5\u5177\u3002",
                "helper.homeIconRadius": "\u4ec5\u5f00\u53d1\u8005\u6a21\u5f0f\u53ef\u89c1\uff0c\u63a7\u5236\u4e3b\u9875\u5de5\u5177\u56fe\u6807\u548c\u540c\u7c7b\u6b63\u65b9\u5f62\u9884\u89c8\u7684\u6bd4\u4f8b\u5706\u89d2\u3002",
                "helper.homeDragShadowIntensity": "\u4ec5\u5f00\u53d1\u8005\u6a21\u5f0f\u53ef\u89c1\uff0c\u63a7\u5236\u4e3b\u9875\u7f16\u8f91\u65f6\u5f53\u524d\u62d6\u52a8\u56fe\u6807\u4e0b\u65b9\u7684\u67d4\u5316\u6295\u5f71\u5f3a\u5ea6\u3002",
                "helper.preset": "\u4ece\u8bbe\u8ba1\u597d\u7684\u7a0b\u5e8f\u5316\u5916\u89c2\u5f00\u59cb\u3002",
                "helper.enableMotion": "\u4ec5\u4f7f\u7528\u7f13\u6162\u7684\u900f\u660e\u5ea6\u548c\u4f4d\u79fb\u52a8\u753b\u3002",
                "settings.backgroundPreset.custom": "\u81ea\u5b9a\u4e49",
                "settings.backgroundPreset.blackGold": "\u9ed1\u91d1\u9ed8\u8ba4",
                "settings.backgroundPreset.solarGrid": "\u592a\u9633\u7f51\u683c",
                "settings.backgroundPreset.obsidianRings": "\u9ed1\u66dc\u5706\u73af",
                "settings.backgroundPreset.midnightBlueprint": "\u5348\u591c\u84dd\u56fe",
                "settings.backgroundPreset.minimalDark": "\u6781\u7b80\u6df1\u8272",
                "helper.refreshSelectionPrompt": "\u70b9\u51fb\u201c\u5237\u65b0\u9009\u62e9\u201d\u4ee5\u68c0\u67e5\u5f53\u524d\u5408\u6210\u9009\u533a\u3002",
                "button.createBackgroundBox": "\u521b\u5efa\u5706\u89d2\u77e9\u5f62",
                "button.refreshSelection": "\u5237\u65b0\u9009\u62e9",
                "button.randomize": "\u968f\u673a",
                "button.resetDefaults": "\u6062\u590d\u9ed8\u8ba4",

                "status.ready": "\u5c31\u7eea",
                "status.readyPeriod": "\u5c31\u7eea\u3002",
                "status.loadingHost": "\u6b63\u5728\u52a0\u8f7d host JSX...",
                "status.hostLoading": "host JSX \u4ecd\u5728\u52a0\u8f7d...",
                "status.hostLoadError": "\u9519\u8bef\uff1ahost JSX \u672a\u52a0\u8f7d\u3002\u8bf7\u68c0\u67e5 host/index.jsx include\u3002",
                "status.noActiveComp": "\u6ca1\u6709\u6fc0\u6d3b\u7684\u5408\u6210",
                "status.openComp": "\u8bf7\u6253\u5f00\u5408\u6210",
                "status.noLayer": "\u8bf7\u81f3\u5c11\u9009\u62e9\u4e00\u4e2a\u56fe\u5c42",
                "status.noTextLayer": "\u8bf7\u81f3\u5c11\u9009\u62e9\u4e00\u4e2a\u6587\u672c\u5c42",
                "status.selectShapeLayer": "\u8bf7\u9009\u62e9\u5f62\u72b6\u56fe\u5c42",
                "status.createdItems": "\u5df2\u521b\u5efa {count} \u4e2a\u9879\u76ee",
                "status.createdBackgroundBoxes": "\u5df2\u521b\u5efa {count} \u4e2a\u80cc\u666f\u5706\u89d2\u77e9\u5f62",
                "status.createdStrokeFillLayer": "\u5df2\u521b\u5efa Stroke / Fill \u5f62\u72b6\u56fe\u5c42",
                "status.creatingBackgroundBox": "\u6b63\u5728\u521b\u5efa\u5706\u89d2\u77e9\u5f62...",
                "status.creatingStrokeFillLayer": "\u6b63\u5728\u521b\u5efa Stroke / Fill \u5f62\u72b6\u56fe\u5c42...",
                "status.selectionUpdated": "\u9009\u62e9\u4fe1\u606f\u5df2\u66f4\u65b0\u3002",
                "status.readingSelection": "\u6b63\u5728\u8bfb\u53d6\u9009\u62e9...",
                "status.noResponse": "After Effects \u6ca1\u6709\u54cd\u5e94\u3002",
                "status.colorPickerOpening": "\u6b63\u5728\u6253\u5f00 AE \u53d6\u8272\u5668...",
                "status.colorUpdated": "\u989c\u8272\u5df2\u66f4\u65b0\u3002",
                "status.colorUnchanged": "\u989c\u8272\u672a\u6539\u53d8\u3002",
                "status.defaultsRestored": "\u5df2\u6062\u590d\u9ed8\u8ba4\u503c\u3002",
                "status.motionSpeedUpdated": "\u52a8\u753b\u901f\u5ea6\u5df2\u66f4\u65b0\u3002",
                "status.backgroundRandomized": "\u80cc\u666f\u5df2\u968f\u673a\u3002",
                "status.backgroundDefaultsRestored": "\u80cc\u666f\u5df2\u6062\u590d\u9ed8\u8ba4\u3002",
                "status.homeEditing": "\u4e3b\u9875\u7f16\u8f91\u4e2d\u3002\u62d6\u52a8\u5de5\u5177\u53ef\u91cd\u6392\u3002",
                "status.homeLayoutSaved": "\u4e3b\u9875\u5e03\u5c40\u5df2\u4fdd\u5b58\u3002",
                "status.addingShape": "\u6b63\u5728\u6dfb\u52a0 {label}...",
                "status.addedShape": "\u5df2\u6dfb\u52a0\uff1a{label}",
                "status.noSelectedLayers": "\u6ca1\u6709\u9009\u4e2d\u56fe\u5c42\u3002",
                "status.unableReadSelection": "\u65e0\u6cd5\u8bfb\u53d6\u9009\u62e9\u3002",

                "selection.noSelection": "\u672a\u9009\u62e9",
                "selection.noShapeTarget": "\u65e0\u5f62\u72b6\u76ee\u6807",
                "selection.shapeTarget": "\u5f62\u72b6\u76ee\u6807",
                "selection.layerCount": "{count} \u4e2a\u56fe\u5c42"
            }
        },

        init: function () {
            var saved = null;
            try {
                saved = window.localStorage.getItem(STORAGE_KEY);
            } catch (err) {
            }
            if (saved && this.dictionaries[saved]) {
                this.currentLanguage = saved;
            } else {
                this.currentLanguage = "en";
            }
            return this.currentLanguage;
        },

        t: function (key, params) {
            var langDict = this.dictionaries[this.currentLanguage] || {};
            var enDict = this.dictionaries.en || {};
            var value = langDict[key];
            var token;

            if (typeof value !== "string") {
                value = enDict[key];
            }
            if (typeof value !== "string") {
                if (!warnedKeys[key] && window.console && console.warn) {
                    window.console.warn("[AE Toolbox i18n] Missing key:", key);
                    warnedKeys[key] = true;
                }
                value = key;
            }
            if (params) {
                for (token in params) {
                    if (Object.prototype.hasOwnProperty.call(params, token)) {
                        value = value.replace(new RegExp("\\{" + token + "\\}", "g"), params[token]);
                    }
                }
            }
            return value;
        },

        setLanguage: function (lang) {
            if (!this.dictionaries[lang]) {
                lang = "en";
            }
            this.currentLanguage = lang;
            try {
                window.localStorage.setItem(STORAGE_KEY, lang);
            } catch (err) {
            }
            return this.currentLanguage;
        },

        getLanguage: function () {
            return this.currentLanguage;
        },

        mergeDictionaries: function (bundle) {
            var lang;
            var key;
            var flatten;
            if (!bundle) {
                return;
            }
            flatten = function (target, prefix, value) {
                var childKey;
                var nextPrefix;
                if (value && typeof value === "object" && Object.prototype.toString.call(value) !== "[object Array]") {
                    for (childKey in value) {
                        if (Object.prototype.hasOwnProperty.call(value, childKey)) {
                            nextPrefix = prefix ? prefix + "." + childKey : childKey;
                            flatten(target, nextPrefix, value[childKey]);
                        }
                    }
                } else if (prefix) {
                    target[prefix] = value;
                }
            };
            for (lang in bundle) {
                if (!Object.prototype.hasOwnProperty.call(bundle, lang)) {
                    continue;
                }
                if (!this.dictionaries[lang]) {
                    this.dictionaries[lang] = {};
                }
                for (key in bundle[lang]) {
                    if (Object.prototype.hasOwnProperty.call(bundle[lang], key)) {
                        flatten(this.dictionaries[lang], key, bundle[lang][key]);
                    }
                }
            }
        },

        applyToDOM: function (root) {
            var scope = root || document;
            var nodes;
            var i;

            if (scope.getAttribute && scope.getAttribute("data-i18n")) {
                scope.textContent = this.t(scope.getAttribute("data-i18n"));
            }
            nodes = scope.querySelectorAll("[data-i18n]");
            for (i = 0; i < nodes.length; i++) {
                nodes[i].textContent = this.t(nodes[i].getAttribute("data-i18n"));
            }

            if (scope.getAttribute && scope.getAttribute("data-i18n-title")) {
                scope.setAttribute("title", this.t(scope.getAttribute("data-i18n-title")));
            }
            nodes = scope.querySelectorAll("[data-i18n-title]");
            for (i = 0; i < nodes.length; i++) {
                nodes[i].setAttribute("title", this.t(nodes[i].getAttribute("data-i18n-title")));
            }

            if (scope.getAttribute && scope.getAttribute("data-i18n-placeholder")) {
                scope.setAttribute("placeholder", this.t(scope.getAttribute("data-i18n-placeholder")));
            }
            nodes = scope.querySelectorAll("[data-i18n-placeholder]");
            for (i = 0; i < nodes.length; i++) {
                nodes[i].setAttribute("placeholder", this.t(nodes[i].getAttribute("data-i18n-placeholder")));
            }

            if (scope.getAttribute && scope.getAttribute("data-i18n-aria-label")) {
                scope.setAttribute("aria-label", this.t(scope.getAttribute("data-i18n-aria-label")));
            }
            nodes = scope.querySelectorAll("[data-i18n-aria-label]");
            for (i = 0; i < nodes.length; i++) {
                nodes[i].setAttribute("aria-label", this.t(nodes[i].getAttribute("data-i18n-aria-label")));
            }
        }
    };

    window.I18n = I18n;
}());
