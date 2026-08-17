"use strict";

var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "..");
var css = fs.readFileSync(path.join(root, "client/css/style.css"), "utf8");
var main = fs.readFileSync(path.join(root, "client/js/main.js"), "utf8");
var index = fs.readFileSync(path.join(root, "client/index.html"), "utf8");
var palette = fs.readFileSync(path.join(root, "client/js/proceduralPaletteWorkspace.js"), "utf8");

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

assert(/detail-content ui-scroll-region ui-floating-action-scroll/.test(index), "Tool Detail scroll owner must opt into floating-action clearance.");
assert(/tool-actions ui-floating-action-region/.test(index), "Tool actions must identify the floating action region.");
assert(/\.has-floating-action-region \.ui-floating-action-scroll\s*\{[^}]*padding-bottom:\s*calc\(var\(--floating-action-clearance, 0px\) \+ var\(--space-card-inset\)\)/.test(css), "Floating action consumers must combine measured obstruction with shared content breathing room.");
assert(/function syncFloatingActionClearance[\s\S]*getBoundingClientRect\(\)[\s\S]*--floating-action-clearance/.test(main), "Clearance must derive from actual action geometry.");
assert(/ResizeObserver[\s\S]*observe\(detail\)[\s\S]*observe\(actions\)/.test(main), "Clearance must react to surface and wrapped action size changes.");
assert(!/has-visible-tool-actions \.detail-content\s*\{[^}]*132px/.test(css), "Tool Detail must not retain the fixed per-tool clearance.");
assert(/\.palette-workspace\.is-stacked\s*\{[^}]*display:\s*flex[^}]*flex-direction:\s*column[^}]*overflow-y:\s*auto/.test(css), "Narrow Palette must use a true stacked scroll composition.");
assert(/\.palette-workspace\.is-stacked \.palette-library-list,\s*\.palette-workspace\.is-stacked \.palette-editor-scroll\s*\{[^}]*overflow:\s*visible/.test(css), "Narrow Palette must have one scroll owner.");
assert(/\.palette-workspace\s*\{[^}]*grid-template-columns:\s*var\(--palette-library-width\)/.test(css), "Wide Palette must preserve master-detail columns.");
assert(/padding-bottom:\s*var\(--scroll-terminal-action-clearance/.test(css), "Stacked Palette must preserve terminal action breathing room.");
assert(/workspace\.className\s*=\s*"palette-workspace"/.test(palette), "Narrow workspace scroll ownership must not require a presentation opt-in class.");
assert(/html,\s*body,\s*\.app-shell,\s*\.app-shell \*\s*\{[^}]*scrollbar-color:[^}]*scrollbar-width:\s*thin/.test(css), "Application scope must provide canonical native scrollbar presentation.");
assert(/classNames:\s*"settings-field palette-editor-field ui-field-row--aligned"/.test(palette), "Palette fields must select the generic aligned CoreUI FieldRow composition.");
assert(/copyClassNames:\s*"settings-field-copy palette-editor-field-copy"/.test(palette), "Palette labels must remain contained in the FieldRow copy region.");
assert(/\.ui-field-row--aligned\s*\{[^}]*display:\s*grid[^}]*grid-template-columns:\s*minmax\(110px, 0\.7fr\) minmax\(180px, 1\.3fr\)/.test(css), "CoreUI FieldRow must own the wide label/control columns.");
assert(!/(?:^|\n)\.palette-editor-field\s*\{[^}]*grid-template-columns/.test(css), "Palette-specific wrappers must not redefine wide FieldRow columns.");
assert(/\.palette-workspace\.is-stacked \.palette-editor-field\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/.test(css), "Only the responsive state may stack Palette FieldRows.");
assert(!/@media\s*\(max-width:\s*620px\)[\s\S]*?\.palette-workspace\s*,/.test(css), "Palette topology must not be controlled by a second viewport-only workspace selector.");
assert(/\.palette-library-list\s*\{[^}]*overflow-y:\s*auto/.test(css) && /\.palette-editor-scroll\s*\{[^}]*overflow-y:\s*auto/.test(css), "Wide Palette panes must retain independent scrolling.");
assert(/\.palette-editor-scroll\s*>\s*\*\s*\{[^}]*flex-shrink:\s*0/.test(css), "Wide Palette editor children must keep intrinsic row geometry inside the scroll owner.");
assert(/\.palette-editor-scroll\s*\{[^}]*gap:\s*calc\([^)]*var\(--ui-scale\)\)/.test(css), "Palette Editor must own its domain-local vertical rhythm.");
assert(/\.palette-editor-field\s*\{[^}]*padding-block:\s*calc\([^)]*var\(--ui-scale\)\)/.test(css), "Palette fields must own their domain-local internal vertical rhythm.");
assert(/\.palette-tool-map,\s*\.palette-import-export\s*\{[^}]*margin-top:\s*0[^}]*padding-top:\s*calc\([^)]*var\(--ui-scale\)\)[^}]*border-top:/.test(css), "Palette section boundaries must not duplicate the Editor stack gap with an extra outer margin.");
assert(!/\.palette-editor-field:last-child[^}]*margin/.test(css), "Palette terminal rhythm must not rely on a last-child margin patch.");
assert(!/\.palette-workspace\.is-stacked\s*\{[^}]*30%/.test(css), "Narrow Palette must not inherit the old percentage pane split.");
assert(/function applyWorkspaceLayout\(workspace\)\s*\{[\s\S]*?classList\.toggle\("is-stacked", layout === "stacked"\);\s*\}/.test(palette), "Responsive switching must converge by toggling state on the existing workspace DOM.");
assert(/createPaletteColorControl[\s\S]*CoreUI\.createColorField[\s\S]*renderPaletteEditorField\("paletteLibrary\." \+ role, createPaletteColorControl/.test(palette), "Color and HEX companions must stay inside one CoreUI control region.");

console.log("Surface layout stability contract tests passed.");
