(function (root, factory) {
    var exported = factory(root);
    if (root && root.document) root.CoreUI = exported;
    else if (typeof module === "object" && module.exports) module.exports = exported;
}(typeof window !== "undefined" ? window : this, function (root) {
    "use strict";

    var activeSelectComponent = null;
    var selectComponentCounter = 0;
    var selectComponents = [];

    function addClasses(element, classNames) {
        var names = String(classNames || "").split(/\s+/);
        var i;
        for (i = 0; i < names.length; i++) {
            if (names[i]) element.classList.add(names[i]);
        }
        return element;
    }

    function applyCommon(element, options) {
        options = options || {};
        if (options.id) element.id = options.id;
        if (options.disabled === true) element.disabled = true;
        if (options.ariaLabel) element.setAttribute("aria-label", options.ariaLabel);
        addClasses(element, options.classNames);
        return element;
    }

    function listen(element, name, callback) {
        if (typeof callback === "function") element.addEventListener(name, callback);
    }

    function createTextInput(options) {
        var doc = options.document;
        var input = applyCommon(doc.createElement("input"), options);
        input.type = options.type || "text";
        input.value = options.value === null || options.value === undefined ? "" : String(options.value);
        addClasses(input, "ui-text-input");
        if (typeof options.maxLength === "number") input.maxLength = options.maxLength;
        input.setAttribute("spellcheck", options.spellcheck === true ? "true" : "false");
        listen(input, "input", options.onInput);
        listen(input, "change", options.onCommit);
        return input;
    }

    function createTextarea(options) {
        var doc = options.document;
        var input = applyCommon(doc.createElement("textarea"), options);
        var direction = options.resizeDirection || "vertical";
        var frame = applyCommon(doc.createElement("span"), { classNames: "ui-scroll-frame ui-textarea-frame ui-resize-" + direction });
        var grip = null;
        var cleanup = null;
        input.value = options.value === null || options.value === undefined ? "" : String(options.value);
        addClasses(input, "ui-textarea ui-editable-scroll");
        if (typeof options.rows === "number") input.rows = options.rows;
        if (options.placeholder) input.placeholder = options.placeholder;
        listen(input, "input", options.onInput);
        listen(input, "change", options.onCommit);
        frame.appendChild(input);
        if (direction !== "none") {
            grip = applyCommon(doc.createElement("span"), { classNames: "ui-resize-grip", ariaLabel: options.resizeAriaLabel || "Resize" });
            grip.setAttribute("role", "presentation"); frame.appendChild(grip);
            cleanup = bindResizeGrip({ grip: grip, frame: frame, direction: direction, minWidth: options.minWidth, maxWidth: options.maxWidth, minHeight: options.minHeight, maxHeight: options.maxHeight });
        }
        input._coreFrame = frame; input._coreResizeGrip = grip;
        input._coreDispose = function () { if (cleanup) cleanup(); };
        return input;
    }

    function bindResizeGrip(options) {
        var grip = options.grip; var frame = options.frame; var direction = options.direction; var doc = grip.ownerDocument; var win = doc.defaultView || root; var activePointer = null;
        function clamp(value, min, max) { if (typeof min === "number") value = Math.max(min, value); if (typeof max === "number") value = Math.min(max, value); return value; }
        function down(event) {
            var startX; var startY; var startWidth; var startHeight; var parent;
            if (!event || event.button !== 0) return;
            startX = event.clientX; startY = event.clientY; startWidth = frame.offsetWidth; startHeight = frame.offsetHeight; parent = frame.parentNode;
            activePointer = event.pointerId; if (grip.setPointerCapture && activePointer !== undefined) grip.setPointerCapture(activePointer);
            doc.body.classList.add("is-resizing-ui-surface"); event.preventDefault(); event.stopPropagation();
            function move(moveEvent) {
                var maxWidth = typeof options.maxWidth === "number" ? options.maxWidth : (parent && parent.clientWidth ? parent.clientWidth : null);
                var maxHeight = typeof options.maxHeight === "number" ? options.maxHeight : null;
                if (direction === "horizontal" || direction === "both") frame.style.width = clamp(startWidth + moveEvent.clientX - startX, options.minWidth || 0, maxWidth) + "px";
                if (direction === "vertical" || direction === "both") frame.style.height = clamp(startHeight + moveEvent.clientY - startY, options.minHeight || 0, maxHeight) + "px";
                moveEvent.preventDefault();
            }
            function end(endEvent) {
                doc.removeEventListener("pointermove", move); doc.removeEventListener("pointerup", end); doc.removeEventListener("pointercancel", end); win.removeEventListener("blur", end);
                if (grip.releasePointerCapture && activePointer !== null && grip.hasPointerCapture && grip.hasPointerCapture(activePointer)) grip.releasePointerCapture(activePointer);
                activePointer = null; doc.body.classList.remove("is-resizing-ui-surface"); if (endEvent && endEvent.preventDefault) endEvent.preventDefault();
            }
            doc.addEventListener("pointermove", move); doc.addEventListener("pointerup", end); doc.addEventListener("pointercancel", end); win.addEventListener("blur", end);
        }
        grip.addEventListener("pointerdown", down);
        return function () { grip.removeEventListener("pointerdown", down); doc.body.classList.remove("is-resizing-ui-surface"); };
    }

    function normalizeNumber(value, field, fallback) {
        var numeric = Number(value);
        var min = field && typeof field.min !== "undefined" ? Number(field.min) : null;
        var max = field && typeof field.max !== "undefined" ? Number(field.max) : null;
        if (isNaN(numeric)) numeric = Number(fallback);
        if (isNaN(numeric)) numeric = Number(field && field.defaultValue);
        if (isNaN(numeric)) numeric = 0;
        if (min !== null && !isNaN(min)) numeric = Math.max(min, numeric);
        if (max !== null && !isNaN(max)) numeric = Math.min(max, numeric);
        return numeric;
    }

    function isNumberDraft(value) {
        var text = String(value || "").replace(/^\s+|\s+$/g, "");
        return text === "" || text === "-" || text === "+" || text === "." || text === "-." || text === "+." || /\.$/.test(text);
    }

    function setNumberValue(input, value, field, fallback) {
        var step = field && typeof field.step !== "undefined" ? Number(field.step) : 1;
        var numeric = normalizeNumber(value, field, fallback);
        var decimals = 0;
        var stepText;
        if (!isNaN(step) && step > 0) {
            stepText = String(step);
            if (stepText.indexOf(".") >= 0) decimals = stepText.length - stepText.indexOf(".") - 1;
        }
        input.value = decimals > 0 ? numeric.toFixed(decimals) : String(Math.round(numeric));
        return input.value;
    }

    function bindNumberDrag(input, field, onUpdate, options) {
        var suppressNextClick = false;
        var editStartValue = input.value;
        var skipNextBlurCommit = false;
        var hasOptions = !!options;
        options = options || {};
        addClasses(input, "ui-number-input registry-number-input is-drag-ready");
        input.addEventListener("focus", function () { editStartValue = input.value; input.classList.add("is-editing-number"); });
        input.addEventListener("blur", function () {
            input.classList.remove("is-editing-number");
            if (options.onCommit && !skipNextBlurCommit) options.onCommit(setNumberValue(input, input.value, field, editStartValue));
            skipNextBlurCommit = false;
        });
        input.addEventListener("click", function (event) {
            if (suppressNextClick) { suppressNextClick = false; event.preventDefault(); return; }
            input.classList.add("is-editing-number");
            try { input.select(); } catch (ignored) {}
        });
        input.addEventListener("keydown", function (event) {
            var direction;
            var step;
            var current;
            if (event.keyCode === 13) {
                if (options.onCommit) { options.onCommit(setNumberValue(input, input.value, field, editStartValue)); skipNextBlurCommit = true; }
                input.blur();
            } else if (event.keyCode === 27) {
                if (options.onCancel) { event.preventDefault(); event.stopPropagation(); setNumberValue(input, editStartValue, field, editStartValue); options.onCancel(input.value); skipNextBlurCommit = true; }
                input.blur();
            } else if (hasOptions && options.enableArrowKeys !== false && (event.keyCode === 38 || event.keyCode === 40)) {
                direction = event.keyCode === 38 ? 1 : -1;
                step = Number(field.step);
                current = normalizeNumber(input.value, field, editStartValue);
                event.preventDefault(); event.stopPropagation();
                if (isNaN(step) || step <= 0) step = 1;
                setNumberValue(input, current + direction * step, field, editStartValue);
                if (onUpdate) onUpdate(input.value);
            }
        });
        input.addEventListener("mousedown", function (event) {
            var startX, startValue, step, dragging = false, previousUserSelect;
            var doc = input.ownerDocument;
            var win = doc.defaultView || root;
            if (event.button !== 0 || input.classList.contains("is-editing-number") || doc.activeElement === input) return;
            startX = event.clientX;
            startValue = normalizeNumber(input.value, field, field.defaultValue);
            step = Number(field.step);
            if (isNaN(step) || step <= 0) step = 1;
            previousUserSelect = doc.body.style.userSelect;
            function move(moveEvent) {
                var delta = moveEvent.clientX - startX;
                if (Math.abs(delta) < 4 && !dragging) return;
                if (!dragging && options.onDragStart) options.onDragStart();
                dragging = true;
                input.blur(); input.classList.remove("is-editing-number"); input.classList.add("is-dragging-number");
                doc.body.style.userSelect = "none"; moveEvent.preventDefault();
                setNumberValue(input, startValue + (delta / 8) * step, field, startValue);
                if (onUpdate) onUpdate(input.value);
                if (options.onDragChange) options.onDragChange(input.value);
            }
            function up() {
                doc.removeEventListener("mousemove", move); doc.removeEventListener("mouseup", up); win.removeEventListener("blur", up);
                doc.body.style.userSelect = previousUserSelect; input.classList.remove("is-dragging-number");
                if (dragging) {
                    suppressNextClick = true;
                    win.setTimeout(function () { suppressNextClick = false; }, 0);
                    if (onUpdate) onUpdate(input.value);
                    if (options.onDragEnd) options.onDragEnd();
                }
            }
            doc.addEventListener("mousemove", move); doc.addEventListener("mouseup", up); win.addEventListener("blur", up);
        });
        return input;
    }

    function createNumberInput(options) {
        var input = applyCommon(options.document.createElement("input"), options);
        input.type = options.type || "text";
        input.inputMode = options.inputMode || "decimal";
        input.value = options.value === null || options.value === undefined ? "" : String(options.value);
        addClasses(input, "ui-number-input");
        if (typeof options.min !== "undefined") input.min = options.min;
        if (typeof options.max !== "undefined") input.max = options.max;
        if (typeof options.step !== "undefined") input.step = options.step;
        bindNumberDrag(input, options.field || options, options.onDragValue, options);
        listen(input, "input", options.onInput);
        listen(input, "change", options.onChange);
        return input;
    }

    function createRangeNumber(options) {
        var doc = options.document;
        var wrap = applyCommon(doc.createElement("span"), { classNames: "ui-range-number " + (options.classNames || "") });
        var valueToDisplay = typeof options.valueToDisplay === "function" ? options.valueToDisplay : function (value) { return value; };
        var displayToValue = typeof options.displayToValue === "function" ? options.displayToValue : function (value) { return Number(value); };
        var displayMin = valueToDisplay(options.min);
        var displayMax = valueToDisplay(options.max);
        var trackMin = valueToDisplay(typeof options.trackMin !== "undefined" ? options.trackMin : options.min);
        var trackMax = valueToDisplay(typeof options.trackMax !== "undefined" ? options.trackMax : options.max);
        var displayStep = typeof options.displayStep !== "undefined" ? options.displayStep : options.step;
        var displayValue = valueToDisplay(options.value);
        var usesPresentationAdapter = typeof options.valueToDisplay === "function" || typeof options.displayToValue === "function" || typeof options.displayStep !== "undefined" || typeof options.onPreview === "function" || typeof options.onCommit === "function";
        var numberField = usesPresentationAdapter ? { min: displayMin, max: displayMax, step: displayStep, defaultValue: displayValue } : (options.field || options);
        var unit;
        var valueCluster;
        var number;
        var range = applyCommon(doc.createElement("input"), { id: options.rangeId, classNames: "ui-range " + (options.rangeClassNames || "") });
        function syncDisplay(nextDisplay) {
            var normalized = normalizeNumber(nextDisplay, { min: displayMin, max: displayMax }, displayValue);
            displayValue = normalized;
            setNumberValue(number, normalized, { min: displayMin, max: displayMax, step: displayStep }, displayValue);
            range.value = number.value;
            return displayToValue(Number(number.value));
        }
        function preview(nextDisplay) {
            var modelValue = syncDisplay(nextDisplay);
            if (options.onPreview) options.onPreview(modelValue);
            return modelValue;
        }
        function commit(nextDisplay) {
            var modelValue = syncDisplay(nextDisplay);
            if (options.onCommit) options.onCommit(modelValue);
            return modelValue;
        }
        number = createNumberInput({ document: doc, id: options.numberId, type: options.numberType || "number", value: displayValue, min: displayMin, max: displayMax, step: displayStep, field: numberField, disabled: options.disabled, classNames: options.numberClassNames, onInput: options.onPreview ? function () { if (!isNumberDraft(number.value)) preview(number.value); } : options.onNumberInput, onDragValue: options.onPreview ? preview : options.onNumberDrag, onCommit: options.onCommit ? commit : options.onNumberCommit, onCancel: options.onCancel ? function () { options.onCancel(); } : options.onNumberCancel, onDragStart: options.onDragStart, onDragChange: options.onDragChange, onDragEnd: options.onCommit ? function () { commit(number.value); if (options.onDragEnd) options.onDragEnd(); } : options.onDragEnd });
        range.disabled = options.disabled === true;
        range.type = "range"; range.min = trackMin; range.max = trackMax; range.step = displayStep; range.value = displayValue;
        if (options.onPreview) listen(range, "input", function () { preview(range.value); });
        if (options.onCommit) listen(range, "change", function () { commit(range.value); });
        if (options.unitText) {
            valueCluster = applyCommon(doc.createElement("span"), { classNames: "ui-range-number-value " + (options.valueClassNames || "") });
            unit = applyCommon(doc.createElement("span"), { classNames: "ui-range-number-unit " + (options.unitClassNames || "") });
            unit.textContent = options.unitText;
            valueCluster.appendChild(number);
            valueCluster.appendChild(unit);
            wrap.appendChild(valueCluster);
        } else {
            wrap.appendChild(number);
        }
        wrap.appendChild(range);
        return { root: wrap, range: range, number: number, unit: unit || null, valueCluster: valueCluster || null, setValue: function (modelValue) { return syncDisplay(valueToDisplay(modelValue)); } };
    }

    function createSelect(options) {
        var select = applyCommon(options.document.createElement("select"), options);
        addClasses(select, "ui-select");
        listen(select, "change", options.onChange);
        return select;
    }

    function closeSelectComponents(exceptComponent) {
        var components = selectComponents.slice(0);
        var i;
        for (i = 0; i < components.length; i++) {
            if (components[i] !== exceptComponent) components[i].close();
        }
    }

    function enhanceSelect(options) {
        options = options || {};
        var select = options.select;
        var doc = options.document || (select && select.ownerDocument);
        var win = doc && (doc.defaultView || root);
        var componentId;
        var control;
        var trigger;
        var label;
        var chevron;
        var menu;
        var viewport;
        var disposed = false;
        var component;

        if (!select || !doc || !select.parentNode) throw new Error("CoreUI.enhanceSelect requires a mounted native select");
        if (select._coreSelectComponent) return select._coreSelectComponent;

        selectComponentCounter += 1;
        componentId = select.id || ("coreSelect" + selectComponentCounter);
        componentId += "-" + selectComponentCounter;

        control = applyCommon(doc.createElement("span"), { classNames: "custom-select select-input-replacement " + (options.controlClassNames || "") });
        control.setAttribute("data-select-for", componentId);
        trigger = applyCommon(doc.createElement("button"), { classNames: "select-trigger", disabled: select.disabled === true });
        trigger.type = "button";
        trigger.setAttribute("aria-haspopup", "listbox");
        trigger.setAttribute("aria-expanded", "false");
        trigger.setAttribute("aria-controls", componentId + "-menu");
        label = applyCommon(doc.createElement("span"), { classNames: "select-label" });
        chevron = applyCommon(doc.createElement("span"), { classNames: "select-chevron" });
        chevron.setAttribute("aria-hidden", "true");
        trigger.appendChild(label);
        trigger.appendChild(chevron);
        control.appendChild(trigger);

        menu = applyCommon(doc.createElement("span"), { id: componentId + "-menu", classNames: "select-menu" });
        menu.setAttribute("role", "listbox");
        menu.setAttribute("data-select-menu-for", componentId);
        viewport = applyCommon(doc.createElement("span"), { classNames: "select-menu-viewport" });
        menu.appendChild(viewport);
        doc.body.appendChild(menu);
        select.parentNode.insertBefore(control, select.nextSibling);
        select.classList.add("is-native-select-hidden");
        select.setAttribute("data-custom-select-id", componentId);
        select.setAttribute("data-customized", "true");

        function optionLabel(option) {
            if (!option) return "";
            if (typeof options.getOptionLabel === "function") return options.getOptionLabel(option);
            return option.textContent;
        }

        function resetMenuGeometry() {
            menu.classList.remove("is-above");
            menu.style.left = "";
            menu.style.top = "";
            menu.style.width = "";
            menu.style.maxHeight = "";
            menu.style.removeProperty("--select-menu-available-height");
        }

        function close(restoreFocus) {
            if (disposed) return;
            control.classList.remove("is-open");
            menu.classList.remove("is-open");
            trigger.setAttribute("aria-expanded", "false");
            resetMenuGeometry();
            if (activeSelectComponent === component) activeSelectComponent = null;
            if (restoreFocus === true && trigger.focus) trigger.focus();
        }

        function position() {
            var rect = control.getBoundingClientRect();
            var viewportWidth = win.innerWidth || doc.documentElement.clientWidth || 320;
            var viewportHeight = win.innerHeight || doc.documentElement.clientHeight || 480;
            var gap = 6;
            var edge = 8;
            var width = Math.min(Math.max(rect.width, 220), viewportWidth - edge * 2);
            var left = Math.max(edge, Math.min(rect.left, viewportWidth - width - edge));
            var desiredHeight;
            var availableBelow;
            var availableAbove;
            var openAbove;
            var maxHeight;
            var top;
            menu.style.width = width + "px";
            menu.style.left = left + "px";
            menu.style.removeProperty("--select-menu-available-height");
            desiredHeight = Math.min(viewport.scrollHeight || 220, 220);
            availableBelow = viewportHeight - rect.bottom - edge - gap;
            availableAbove = rect.top - edge - gap;
            openAbove = availableBelow < desiredHeight && availableAbove > availableBelow;
            maxHeight = Math.max(72, Math.min(desiredHeight, openAbove ? availableAbove : availableBelow));
            top = openAbove ? rect.top - maxHeight - gap : rect.bottom + gap;
            menu.classList.toggle("is-above", openAbove);
            menu.style.top = Math.max(edge, top) + "px";
            menu.style.setProperty("--select-menu-available-height", maxHeight + "px");
        }

        function sync() {
            var option = select.options[select.selectedIndex] || select.options[0];
            var buttons = viewport.querySelectorAll(".select-option");
            var i;
            label.textContent = optionLabel(option);
            trigger.disabled = select.disabled === true;
            control.classList.toggle("is-disabled", select.disabled === true);
            for (i = 0; i < buttons.length; i++) {
                buttons[i].classList.toggle("is-selected", buttons[i].getAttribute("data-value") === select.value);
                buttons[i].setAttribute("aria-selected", buttons[i].getAttribute("data-value") === select.value ? "true" : "false");
            }
            if (select.disabled === true) close();
        }

        function emitChange() {
            var event = doc.createEvent("HTMLEvents");
            event.initEvent("change", true, false);
            select.dispatchEvent(event);
        }

        function setValue(value, notify) {
            select.value = value;
            sync();
            if (notify === true) emitChange();
        }

        function rebuild() {
            var nativeOptions = select.options || [];
            var optionButton;
            var i;
            viewport.innerHTML = "";
            for (i = 0; i < nativeOptions.length; i++) {
                optionButton = applyCommon(doc.createElement("button"), { classNames: "select-option", disabled: nativeOptions[i].disabled === true });
                optionButton.type = "button";
                optionButton.setAttribute("role", "option");
                optionButton.setAttribute("data-value", nativeOptions[i].value);
                optionButton.textContent = optionLabel(nativeOptions[i]);
                optionButton.addEventListener("click", function () {
                    if (!this.disabled) {
                        setValue(this.getAttribute("data-value"), true);
                        close(true);
                    }
                });
                viewport.appendChild(optionButton);
            }
            sync();
        }

        function open() {
            if (disposed || select.disabled === true) return;
            closeSelectComponents(component);
            position();
            control.classList.add("is-open");
            menu.classList.add("is-open");
            trigger.setAttribute("aria-expanded", "true");
            activeSelectComponent = component;
        }

        function triggerClick(event) {
            event.preventDefault();
            event.stopPropagation();
            if (control.classList.contains("is-open")) close();
            else open();
        }

        function triggerKeydown(event) {
            var buttons = viewport.querySelectorAll(".select-option:not(:disabled)");
            var selected = viewport.querySelector(".select-option.is-selected");
            var selectedIndex = 0;
            var nextIndex;
            var i;
            for (i = 0; i < buttons.length; i++) if (buttons[i] === selected) selectedIndex = i;
            if (event.keyCode === 13 || event.keyCode === 32) {
                event.preventDefault();
                if (control.classList.contains("is-open")) close();
                else open();
            } else if (event.keyCode === 27) {
                event.preventDefault();
                close(true);
            } else if (event.keyCode === 38 || event.keyCode === 40) {
                event.preventDefault();
                if (!buttons.length) return;
                nextIndex = selectedIndex + (event.keyCode === 40 ? 1 : -1);
                if (nextIndex < 0) nextIndex = buttons.length - 1;
                if (nextIndex >= buttons.length) nextIndex = 0;
                setValue(buttons[nextIndex].getAttribute("data-value"), true);
            }
        }

        function selectChange() { sync(); }
        function outsideClick(event) {
            if (!control.contains(event.target) && !menu.contains(event.target)) close();
        }
        function viewportChange(event) {
            if (event && event.target && menu.contains(event.target)) return;
            close();
        }

        function dispose() {
            var index;
            if (disposed) return;
            close();
            disposed = true;
            trigger.removeEventListener("click", triggerClick);
            trigger.removeEventListener("keydown", triggerKeydown);
            select.removeEventListener("change", selectChange);
            doc.removeEventListener("click", outsideClick);
            doc.removeEventListener("scroll", viewportChange, true);
            win.removeEventListener("resize", viewportChange);
            if (control.parentNode) control.parentNode.removeChild(control);
            if (menu.parentNode) menu.parentNode.removeChild(menu);
            select.classList.remove("is-native-select-hidden");
            select.removeAttribute("data-custom-select-id");
            select.removeAttribute("data-customized");
            select._coreSelectComponent = null;
            index = selectComponents.indexOf(component);
            if (index >= 0) selectComponents.splice(index, 1);
        }

        component = { id: "select", variant: "custom-portal", select: select, root: control, trigger: trigger, menu: menu, viewport: viewport, open: open, close: close, sync: sync, rebuild: rebuild, setValue: setValue, setDisabled: function (disabled) { select.disabled = disabled === true; sync(); }, dispose: dispose };
        select._coreSelectComponent = component;
        selectComponents.push(component);
        trigger.addEventListener("click", triggerClick);
        trigger.addEventListener("keydown", triggerKeydown);
        select.addEventListener("change", selectChange);
        doc.addEventListener("click", outsideClick);
        doc.addEventListener("scroll", viewportChange, true);
        win.addEventListener("resize", viewportChange);
        rebuild();
        return component;
    }

    function createSwitch(options) {
        var doc = options.document;
        var rootElement = applyCommon(doc.createElement(options.label === true ? "label" : "span"), { classNames: "ui-switch " + (options.classNames || "") });
        var input = applyCommon(doc.createElement("input"), { id: options.id, disabled: options.disabled });
        var track = doc.createElement("span");
        input.type = "checkbox"; input.checked = options.checked === true; track.className = "switch-track ui-switch-track";
        if (options.label === true && options.id) rootElement.setAttribute("for", options.id);
        listen(input, "change", options.onChange);
        rootElement.appendChild(input); rootElement.appendChild(track);
        return { root: rootElement, input: input, track: track };
    }

    function createCheckbox(options) {
        var doc = options.document;
        var rootElement = applyCommon(doc.createElement("label"), { classNames: "ui-checkbox " + (options.classNames || "") });
        var input = applyCommon(doc.createElement("input"), { id: options.id, disabled: options.disabled, ariaLabel: options.ariaLabel });
        var mark = doc.createElement("span");
        var text;
        input.type = "checkbox";
        input.checked = options.checked === true;
        mark.className = "ui-checkbox-mark";
        mark.setAttribute("aria-hidden", "true");
        listen(input, "change", options.onChange);
        rootElement.appendChild(input);
        rootElement.appendChild(mark);
        if (options.labelText !== undefined) {
            text = doc.createElement("span");
            text.className = "ui-checkbox-label";
            text.textContent = String(options.labelText);
            rootElement.appendChild(text);
        }
        return { root: rootElement, input: input, mark: mark, label: text || null };
    }

    function createChoiceGroup(options) {
        var doc = options.document;
        var rootElement = applyCommon(doc.createElement("div"), { classNames: "ui-choice-group " + (options.classNames || ""), ariaLabel: options.ariaLabel });
        var input = applyCommon(doc.createElement("input"), { id: options.id });
        var optionSpecs = options.options || [];
        var buttons = [];
        var value = String(options.value === undefined || options.value === null ? "" : options.value);
        var groupDisabled = options.disabled === true;
        var i;
        rootElement.setAttribute("role", "radiogroup");
        rootElement.setAttribute("aria-disabled", groupDisabled ? "true" : "false");
        input.type = "hidden";
        input.value = value;
        rootElement.appendChild(input);

        function enabledIndexes() {
            var result = [];
            var index;
            for (index = 0; index < buttons.length; index++) if (!buttons[index].disabled) result.push(index);
            return result;
        }
        function sync(nextValue, emit) {
            var selectedIndex = -1;
            var index;
            value = String(nextValue);
            input.value = value;
            for (index = 0; index < buttons.length; index++) {
                if (buttons[index].getAttribute("data-choice-value") === value) selectedIndex = index;
            }
            for (index = 0; index < buttons.length; index++) {
                buttons[index].setAttribute("aria-checked", index === selectedIndex ? "true" : "false");
                buttons[index].classList.toggle("is-active", index === selectedIndex);
                buttons[index].tabIndex = index === selectedIndex || selectedIndex < 0 && !buttons[index].disabled ? 0 : -1;
                if (selectedIndex < 0 && buttons[index].tabIndex === 0) selectedIndex = index;
            }
            if (emit && typeof options.onChange === "function") options.onChange(value);
            return value;
        }
        function selectButton(button, focus) {
            if (!button || button.disabled) return;
            sync(button.getAttribute("data-choice-value"), true);
            if (focus && typeof button.focus === "function") button.focus();
        }
        function handleKey(event) {
            var enabled = enabledIndexes();
            var current = buttons.indexOf(this);
            var position = enabled.indexOf(current);
            var target = -1;
            if (!enabled.length) return;
            if (event.keyCode === 36) target = enabled[0];
            else if (event.keyCode === 35) target = enabled[enabled.length - 1];
            else if (event.keyCode === 37 || event.keyCode === 38) target = enabled[(position <= 0 ? enabled.length : position) - 1];
            else if (event.keyCode === 39 || event.keyCode === 40) target = enabled[(position + 1) % enabled.length];
            if (target >= 0) { event.preventDefault(); selectButton(buttons[target], true); }
        }
        for (i = 0; i < optionSpecs.length; i++) {
            (function (spec) {
                var button = createButton({ document: doc, disabled: groupDisabled || spec.disabled === true, classNames: "ui-choice-surface " + (spec.classNames || "") });
                var label;
                var description;
                button.setAttribute("role", "radio");
                button.setAttribute("data-choice-value", String(spec.value));
                button.setAttribute("aria-disabled", groupDisabled || spec.disabled === true ? "true" : "false");
                if (spec.disabled === true) button.setAttribute("data-core-intrinsic-disabled", "true");
                if (typeof options.renderOption === "function") options.renderOption(button, spec);
                else {
                    label = doc.createElement("strong"); label.className = "ui-choice-label"; label.textContent = spec.label || String(spec.value); button.appendChild(label);
                    if (spec.description) { description = doc.createElement("small"); description.className = "ui-choice-description"; description.textContent = spec.description; button.appendChild(description); }
                }
                listen(button, "click", function () { selectButton(button, false); });
                listen(button, "keydown", handleKey);
                buttons.push(button);
                rootElement.appendChild(button);
            }(optionSpecs[i]));
        }
        sync(value, false);
        return { root: rootElement, input: input, options: buttons, getValue: function () { return value; }, setValue: function (nextValue) { return sync(nextValue, false); } };
    }

    var BEZIER_PRECISION = 4;
    var BEZIER_EPSILON = 0.0001;

    function roundBezierNumber(value) {
        var factor = Math.pow(10, BEZIER_PRECISION);
        var rounded = Math.round(Number(value) * factor) / factor;
        return Math.abs(rounded) < 1 / factor ? 0 : rounded;
    }

    function isValidBezierValue(value) {
        return !!value && isFinite(Number(value.x1)) && isFinite(Number(value.y1)) && isFinite(Number(value.x2)) && isFinite(Number(value.y2)) && Number(value.x1) >= 0 && Number(value.x1) <= 1 && Number(value.x2) >= 0 && Number(value.x2) <= 1;
    }

    function normalizeBezierValue(value, fallback) {
        var source = isValidBezierValue(value) ? value : (isValidBezierValue(fallback) ? fallback : { x1: 0.25, y1: 0.1, x2: 0.25, y2: 1 });
        return { x1: roundBezierNumber(source.x1), y1: roundBezierNumber(source.y1), x2: roundBezierNumber(source.x2), y2: roundBezierNumber(source.y2) };
    }

    function parseCubicBezier(text) {
        var match = /^\s*cubic-bezier\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*\)\s*$/i.exec(String(text || ""));
        var value;
        var numericPattern = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i;
        if (!match) return null;
        if (!numericPattern.test(match[1].replace(/^\s+|\s+$/g, "")) || !numericPattern.test(match[2].replace(/^\s+|\s+$/g, "")) || !numericPattern.test(match[3].replace(/^\s+|\s+$/g, "")) || !numericPattern.test(match[4].replace(/^\s+|\s+$/g, ""))) return null;
        value = { x1: Number(match[1]), y1: Number(match[2]), x2: Number(match[3]), y2: Number(match[4]) };
        return isValidBezierValue(value) ? normalizeBezierValue(value) : null;
    }

    function serializeCubicBezier(value) {
        var normalized = isValidBezierValue(value) ? normalizeBezierValue(value) : null;
        return normalized ? "cubic-bezier(" + normalized.x1 + ", " + normalized.y1 + ", " + normalized.x2 + ", " + normalized.y2 + ")" : "";
    }

    function sampleBezier(value, u) {
        var inverse = 1 - u;
        return {
            x: 3 * inverse * inverse * u * value.x1 + 3 * inverse * u * u * value.x2 + u * u * u,
            y: 3 * inverse * inverse * u * value.y1 + 3 * inverse * u * u * value.y2 + u * u * u
        };
    }

    function sampleBezierSpeed(value, u) {
        var inverse = 1 - u;
        var dx = 3 * inverse * inverse * value.x1 + 6 * inverse * u * (value.x2 - value.x1) + 3 * u * u * (1 - value.x2);
        var dy = 3 * inverse * inverse * value.y1 + 6 * inverse * u * (value.y2 - value.y1) + 3 * u * u * (1 - value.y2);
        if (Math.abs(dx) < BEZIER_EPSILON) return null;
        return isFinite(dy / dx) ? dy / dx : null;
    }

    function bezierSpeedProjection(value) {
        var startInfluence = value.x1;
        var endInfluence = 1 - value.x2;
        return {
            startInfluence: startInfluence,
            startSpeed: startInfluence > BEZIER_EPSILON ? value.y1 / startInfluence : null,
            endInfluence: endInfluence,
            endSpeed: endInfluence > BEZIER_EPSILON ? (1 - value.y2) / endInfluence : null
        };
    }

    function createBezierCurveField(options) {
        var doc = options.document;
        var win = doc.defaultView || root;
        var disabled = options.disabled === true;
        var readonly = options.readonly === true;
        var value = normalizeBezierValue(options.value, options.defaultValue);
        var editSnapshot = normalizeBezierValue(value);
        var activeDrag = null;
        var disposed = false;
        var view = options.initialView === "speed" ? "speed" : "progress";
        var rootElement = applyCommon(doc.createElement("div"), { classNames: "ui-bezier-field " + (options.classNames || "") });
        var valueInput = applyCommon(doc.createElement("input"), { id: options.id, disabled: disabled, classNames: "ui-bezier-value" });
        var viewSelector = doc.createElement("div");
        var progressButton = createButton({ document: doc, text: options.progressLabel || "Progress / Value", disabled: disabled, classNames: "ui-bezier-view-button" });
        var speedButton = createButton({ document: doc, text: options.speedLabel || "Speed", disabled: disabled, classNames: "ui-bezier-view-button" });
        var speedHint = doc.createElement("p");
        var viewport = doc.createElement("div");
        var serialized = doc.createElement("output");
        var svg = doc.createElementNS ? doc.createElementNS("http://www.w3.org/2000/svg", "svg") : doc.createElement("svg");
        var gridPath = svgElement("path", "ui-bezier-grid");
        var tangentPath = svgElement("path", "ui-bezier-tangents");
        var curvePath = svgElement("path", "ui-bezier-curve");
        var startPoint = svgElement("circle", "ui-bezier-endpoint");
        var endPoint = svgElement("circle", "ui-bezier-endpoint");
        var handle1 = svgElement("circle", "ui-bezier-handle");
        var handle2 = svgElement("circle", "ui-bezier-handle");
        var numericGrid = doc.createElement("div");
        var numeric = {};
        var resizeHandler;
        var resizeObserver;
        var WIDTH = 400;
        var HEIGHT = 220;
        var PAD_X = 28;
        var PAD_Y = 20;
        var SPEED_INFLUENCE_VISUAL_SPAN = 0.5;

        function svgElement(tag, className) {
            var node = doc.createElementNS ? doc.createElementNS("http://www.w3.org/2000/svg", tag) : doc.createElement(tag);
            node.setAttribute("class", className);
            return node;
        }
        function cloneValue(source) { return { x1: source.x1, y1: source.y1, x2: source.x2, y2: source.y2 }; }
        function emit(kind, meta) {
            var callback = kind === "input" ? options.onInput : options.onChange;
            if (typeof callback === "function") callback(cloneValue(value), meta || {});
        }
        function progressViewRange(source) {
            var min = Math.min(0, 1, source.y1, source.y2);
            var max = Math.max(0, 1, source.y1, source.y2);
            var span = Math.max(1, max - min);
            return { min: min - span * 0.15, max: max + span * 0.15 };
        }
        function speedViewRange(source) {
            var min = 0;
            var max = 1;
            var i;
            var speed;
            for (i = 0; i <= 48; i++) {
                speed = sampleBezierSpeed(source, i / 48);
                if (speed !== null) { min = Math.min(min, Math.max(-20, speed)); max = Math.max(max, Math.min(20, speed)); }
            }
            if (max - min < 1) max = min + 1;
            return { min: min - (max - min) * 0.12, max: max + (max - min) * 0.12 };
        }
        function mapX(x) { return PAD_X + x * (WIDTH - PAD_X * 2); }
        function mapSpeedInfluenceX(index, influence) { return mapX(index === 1 ? influence * SPEED_INFLUENCE_VISUAL_SPAN : 1 - influence * SPEED_INFLUENCE_VISUAL_SPAN); }
        function mapY(y, range) { return HEIGHT - PAD_Y - (y - range.min) / (range.max - range.min) * (HEIGHT - PAD_Y * 2); }
        function clientToSvgX(clientX, rect) { return (clientX - rect.left) / Math.max(1, rect.width) * WIDTH; }
        function unmapX(clientX, rect) { return Math.max(0, Math.min(1, (clientToSvgX(clientX, rect) - PAD_X) / (WIDTH - PAD_X * 2))); }
        function unmapSpeedInfluence(clientX, rect, index) { var graphX = (clientToSvgX(clientX, rect) - PAD_X) / (WIDTH - PAD_X * 2); return (index === 1 ? graphX : 1 - graphX) / SPEED_INFLUENCE_VISUAL_SPAN; }
        function unmapY(clientY, rect, range) { var svgY = (clientY - rect.top) / Math.max(1, rect.height) * HEIGHT; return range.max - (svgY - PAD_Y) / (HEIGHT - PAD_Y * 2) * (range.max - range.min); }
        function pathFromSamples(source, range, speedMode) {
            var path = "";
            var i;
            var point;
            var speed;
            for (i = 0; i <= 64; i++) {
                point = sampleBezier(source, i / 64);
                speed = speedMode ? sampleBezierSpeed(source, i / 64) : point.y;
                if (speed === null) continue;
                speed = Math.max(range.min, Math.min(range.max, speed));
                path += (path ? " L " : "M ") + roundBezierNumber(mapX(point.x)) + " " + roundBezierNumber(mapY(speed, range));
            }
            return path;
        }
        function setCircle(circle, x, y) { circle.setAttribute("cx", roundBezierNumber(x)); circle.setAttribute("cy", roundBezierNumber(y)); circle.setAttribute("r", 7); }
        function render() {
            var range = activeDrag && activeDrag.range ? activeDrag.range : (view === "speed" ? speedViewRange(value) : progressViewRange(value));
            var projection = bezierSpeedProjection(value);
            var h1y = view === "speed" ? (projection.startSpeed === null ? range.max : projection.startSpeed) : value.y1;
            var h2y = view === "speed" ? (projection.endSpeed === null ? range.max : projection.endSpeed) : value.y2;
            valueInput.value = serializeCubicBezier(value);
            serialized.textContent = valueInput.value;
            curvePath.setAttribute("d", pathFromSamples(value, range, view === "speed"));
            gridPath.setAttribute("d", "M " + PAD_X + " " + mapY(0, range) + " H " + (WIDTH - PAD_X) + " M " + PAD_X + " " + mapY(1, range) + " H " + (WIDTH - PAD_X));
            setCircle(startPoint, mapX(0), mapY(view === "speed" ? Math.max(range.min, Math.min(range.max, h1y)) : 0, range));
            setCircle(endPoint, mapX(1), mapY(view === "speed" ? Math.max(range.min, Math.min(range.max, h2y)) : 1, range));
            setCircle(handle1, view === "speed" ? mapSpeedInfluenceX(1, projection.startInfluence) : mapX(value.x1), mapY(Math.max(range.min, Math.min(range.max, h1y)), range));
            setCircle(handle2, view === "speed" ? mapSpeedInfluenceX(2, projection.endInfluence) : mapX(value.x2), mapY(Math.max(range.min, Math.min(range.max, h2y)), range));
            tangentPath.setAttribute("d", view === "progress" ? "M " + mapX(0) + " " + mapY(0, range) + " L " + mapX(value.x1) + " " + mapY(value.y1, range) + " M " + mapX(1) + " " + mapY(1, range) + " L " + mapX(value.x2) + " " + mapY(value.y2, range) : "M " + mapX(0) + " " + mapY(Math.max(range.min, Math.min(range.max, h1y)), range) + " L " + mapSpeedInfluenceX(1, projection.startInfluence) + " " + mapY(Math.max(range.min, Math.min(range.max, h1y)), range) + " M " + mapX(1) + " " + mapY(Math.max(range.min, Math.min(range.max, h2y)), range) + " L " + mapSpeedInfluenceX(2, projection.endInfluence) + " " + mapY(Math.max(range.min, Math.min(range.max, h2y)), range));
            handle1.setAttribute("aria-disabled", disabled || readonly || projection.startSpeed === null && view === "speed" ? "true" : "false");
            handle2.setAttribute("aria-disabled", disabled || readonly || projection.endSpeed === null && view === "speed" ? "true" : "false");
            handle1.setAttribute("aria-valuetext", view === "speed" ? "Influence " + value.x1 + ", Speed " + (projection.startSpeed === null ? "undefined" : roundBezierNumber(projection.startSpeed)) : "X " + value.x1 + ", Y " + value.y1);
            handle2.setAttribute("aria-valuetext", view === "speed" ? "Influence " + roundBezierNumber(1 - value.x2) + ", Speed " + (projection.endSpeed === null ? "undefined" : roundBezierNumber(projection.endSpeed)) : "X " + value.x2 + ", Y " + value.y2);
            progressButton.classList.toggle("is-active", view === "progress");
            speedButton.classList.toggle("is-active", view === "speed");
            rootElement.setAttribute("data-view", view);
            speedHint.hidden = view !== "speed" || !speedHint.textContent;
            if (numeric.x1) {
                numeric.x1.value = String(value.x1); numeric.y1.value = String(value.y1); numeric.x2.value = String(value.x2); numeric.y2.value = String(value.y2);
            }
        }
        function applyValue(nextValue, kind, meta) {
            if (!isValidBezierValue(nextValue)) return false;
            value = normalizeBezierValue(nextValue, value);
            render();
            if (kind) emit(kind, meta);
            return true;
        }
        function setCoordinate(key, nextValue, kind, meta) {
            var next = cloneValue(value);
            var numericValue = Number(nextValue);
            if (!isFinite(numericValue)) return false;
            if (key === "x1" || key === "x2") numericValue = Math.max(0, Math.min(1, numericValue));
            next[key] = numericValue;
            return applyValue(next, kind, meta);
        }
        function buildNumeric(key, labelText, min, max) {
            var field = doc.createElement("label");
            var label = doc.createElement("span");
            var input;
            label.textContent = labelText;
            field.className = "ui-bezier-numeric-field";
            input = createNumberInput({ document: doc, id: (options.id || "bezier") + "-" + key, value: value[key], min: min, max: max, step: 0.01, field: { min: min, max: max, step: 0.01, defaultValue: value[key] }, disabled: disabled || readonly, ariaLabel: labelText, onInput: function () { if (!isNumberDraft(input.value)) setCoordinate(key, input.value, "input", { source: "numeric", coordinate: key }); }, onDragValue: function (next) { setCoordinate(key, next, "input", { source: "numeric-scrub", coordinate: key }); }, onCommit: function () { if (!setCoordinate(key, input.value, "change", { source: "numeric", coordinate: key })) render(); }, onCancel: function (restored) { setCoordinate(key, restored, null); render(); if (typeof options.onCancel === "function") options.onCancel(cloneValue(value), { source: "numeric", coordinate: key }); }, onDragEnd: function () { emit("change", { source: "numeric-scrub", coordinate: key }); } });
            field.appendChild(label); field.appendChild(input); numericGrid.appendChild(field); numeric[key] = input;
        }
        function switchView(nextView) {
            if (nextView !== "progress" && nextView !== "speed") return;
            view = nextView;
            progressButton.setAttribute("aria-pressed", view === "progress" ? "true" : "false");
            speedButton.setAttribute("aria-pressed", view === "speed" ? "true" : "false");
            render();
        }
        function setDisabled(nextDisabled) {
            disabled = nextDisabled === true;
            valueInput.disabled = disabled;
            progressButton.disabled = disabled;
            speedButton.disabled = disabled;
            numeric.x1.disabled = disabled || readonly; numeric.y1.disabled = disabled || readonly; numeric.x2.disabled = disabled || readonly; numeric.y2.disabled = disabled || readonly;
            handle1.setAttribute("tabindex", disabled || readonly ? "-1" : "0"); handle2.setAttribute("tabindex", disabled || readonly ? "-1" : "0");
            rootElement.setAttribute("aria-disabled", disabled ? "true" : "false");
            render();
        }
        function beginDrag(event, index) {
            var range;
            var projection;
            var rect;
            var pointerX;
            var pointerY;
            var influence;
            var speed;
            if (disabled || readonly || disposed) return;
            range = view === "speed" ? speedViewRange(value) : progressViewRange(value);
            projection = bezierSpeedProjection(value);
            if (view === "speed" && (index === 1 ? projection.startSpeed === null : projection.endSpeed === null)) return;
            editSnapshot = cloneValue(value);
            activeDrag = { index: index, range: range, pointerId: event.pointerId, shiftConstrained: view === "speed" && event.shiftKey === true, transitionReference: null };
            if (view === "speed") {
                rect = svg.getBoundingClientRect();
                pointerX = unmapSpeedInfluence(event.clientX, rect, index);
                pointerY = unmapY(event.clientY, rect, range);
                influence = index === 1 ? projection.startInfluence : projection.endInfluence;
                speed = index === 1 ? projection.startSpeed : projection.endSpeed;
                activeDrag.transitionReference = { pointerX: pointerX, pointerY: pointerY, influence: influence, speed: speed };
            }
            if (event.currentTarget && event.currentTarget.setPointerCapture && event.pointerId !== undefined) try { event.currentTarget.setPointerCapture(event.pointerId); } catch (ignored) {}
            if (event.preventDefault) event.preventDefault();
            doc.addEventListener("pointermove", dragMove); doc.addEventListener("pointerup", dragEnd); doc.addEventListener("pointercancel", dragCancel); doc.addEventListener("keydown", dragKeydown);
        }
        function dragMove(event) {
            var rect;
            var x;
            var y;
            var next;
            var projection;
            var influence;
            var speed;
            var shiftConstrained;
            if (!activeDrag) return;
            if (doc.documentElement && doc.documentElement.contains && !doc.documentElement.contains(rootElement)) { dragCancel(); return; }
            rect = svg.getBoundingClientRect();
            x = view === "speed" ? unmapSpeedInfluence(event.clientX, rect, activeDrag.index) : unmapX(event.clientX, rect);
            y = unmapY(event.clientY, rect, activeDrag.range);
            shiftConstrained = view === "speed" && event.shiftKey === true;
            if (view === "speed" && shiftConstrained !== activeDrag.shiftConstrained) {
                projection = bezierSpeedProjection(value);
                influence = activeDrag.index === 1 ? projection.startInfluence : projection.endInfluence;
                speed = activeDrag.index === 1 ? projection.startSpeed : projection.endSpeed;
                activeDrag.shiftConstrained = shiftConstrained;
                activeDrag.transitionReference = { pointerX: x, pointerY: y, influence: influence, speed: speed };
                if (event.preventDefault) event.preventDefault();
                return;
            }
            next = cloneValue(value);
            if (view === "progress") {
                next[activeDrag.index === 1 ? "x1" : "x2"] = x;
                next[activeDrag.index === 1 ? "y1" : "y2"] = y;
            } else {
                if (activeDrag.transitionReference) {
                    influence = Math.max(0, Math.min(1, activeDrag.transitionReference.influence + x - activeDrag.transitionReference.pointerX));
                    speed = activeDrag.shiftConstrained ? activeDrag.transitionReference.speed : activeDrag.transitionReference.speed + (y - activeDrag.transitionReference.pointerY);
                } else {
                    influence = Math.max(0, Math.min(1, x));
                    speed = y;
                }
                if (activeDrag.index === 1) { next.x1 = influence; next.y1 = speed * influence; }
                else { next.x2 = 1 - influence; next.y2 = 1 - speed * influence; }
            }
            applyValue(next, "input", { source: view + "-graph", point: activeDrag.index });
            if (event.preventDefault) event.preventDefault();
        }
        function dragKeydown(event) { if (activeDrag && event.keyCode === 27) { if (event.preventDefault) event.preventDefault(); dragCancel(); } }
        function clearDrag() { doc.removeEventListener("pointermove", dragMove); doc.removeEventListener("pointerup", dragEnd); doc.removeEventListener("pointercancel", dragCancel); doc.removeEventListener("keydown", dragKeydown); activeDrag = null; }
        function dragEnd() { if (!activeDrag) return; clearDrag(); render(); emit("change", { source: view + "-graph" }); }
        function dragCancel() { if (!activeDrag) return; clearDrag(); applyValue(editSnapshot, null); if (typeof options.onCancel === "function") options.onCancel(cloneValue(value), { source: "pointercancel" }); }
        function handleKey(event, index) {
            var dx = 0;
            var dy = 0;
            var amount = event.shiftKey ? 0.05 : 0.01;
            var next;
            if (disabled || readonly) return;
            if (event.keyCode === 37) dx = -amount; else if (event.keyCode === 39) dx = amount; else if (event.keyCode === 38) dy = amount; else if (event.keyCode === 40) dy = -amount; else return;
            event.preventDefault();
            next = cloneValue(value);
            if (view === "progress") {
                next[index === 1 ? "x1" : "x2"] = Math.max(0, Math.min(1, next[index === 1 ? "x1" : "x2"] + dx));
                next[index === 1 ? "y1" : "y2"] += dy;
            } else {
                var projection = bezierSpeedProjection(value);
                var influence = index === 1 ? projection.startInfluence : projection.endInfluence;
                var speed = index === 1 ? projection.startSpeed : projection.endSpeed;
                if (speed === null) return;
                influence = Math.max(0, Math.min(1, influence + (index === 1 ? dx : -dx)));
                speed += dy;
                if (index === 1) { next.x1 = influence; next.y1 = speed * influence; }
                else { next.x2 = 1 - influence; next.y2 = 1 - speed * influence; }
            }
            applyValue(next, "input", { source: "keyboard", point: index });
            emit("change", { source: "keyboard", point: index });
        }

        valueInput.type = "hidden";
        rootElement.setAttribute("aria-disabled", disabled ? "true" : "false");
        rootElement.setAttribute("data-readonly", readonly ? "true" : "false");
        valueInput._coreBezierFieldGetValue = function () { return cloneValue(value); };
        valueInput._coreBezierFieldSetValue = function (next) { applyValue(next, null); };
        viewSelector.className = "ui-bezier-view-selector"; viewSelector.setAttribute("role", "group");
        progressButton.setAttribute("aria-pressed", view === "progress" ? "true" : "false"); speedButton.setAttribute("aria-pressed", view === "speed" ? "true" : "false");
        progressButton.addEventListener("click", function () { switchView("progress"); });
        speedButton.addEventListener("click", function () { switchView("speed"); });
        viewport.className = "ui-bezier-viewport";
        serialized.className = "ui-bezier-serialized";
        serialized.setAttribute("aria-live", "polite");
        speedHint.className = "ui-bezier-speed-hint"; speedHint.textContent = options.speedHint || "";
        svg.setAttribute("viewBox", "0 0 " + WIDTH + " " + HEIGHT); svg.setAttribute("role", "img"); svg.setAttribute("aria-label", options.graphLabel || "Cubic Bezier curve editor");
        handle1.setAttribute("tabindex", disabled || readonly ? "-1" : "0"); handle2.setAttribute("tabindex", disabled || readonly ? "-1" : "0");
        handle1.setAttribute("role", "slider"); handle2.setAttribute("role", "slider"); handle1.setAttribute("aria-label", options.point1Label || "Control Point 1"); handle2.setAttribute("aria-label", options.point2Label || "Control Point 2");
        handle1.addEventListener("pointerdown", function (event) { beginDrag(event, 1); }); handle2.addEventListener("pointerdown", function (event) { beginDrag(event, 2); });
        handle1.addEventListener("keydown", function (event) { handleKey(event, 1); }); handle2.addEventListener("keydown", function (event) { handleKey(event, 2); });
        svg.appendChild(gridPath); svg.appendChild(tangentPath); svg.appendChild(curvePath); svg.appendChild(startPoint); svg.appendChild(endPoint); svg.appendChild(handle1); svg.appendChild(handle2); viewport.appendChild(svg);
        numericGrid.className = "ui-bezier-numeric-grid";
        buildNumeric("x1", options.x1Label || "P1 X", 0, 1); buildNumeric("y1", options.y1Label || "P1 Y"); buildNumeric("x2", options.x2Label || "P2 X", 0, 1); buildNumeric("y2", options.y2Label || "P2 Y");
        rootElement.appendChild(valueInput); rootElement.appendChild(viewSelector); viewSelector.appendChild(progressButton); viewSelector.appendChild(speedButton); rootElement.appendChild(speedHint); rootElement.appendChild(viewport); rootElement.appendChild(serialized); rootElement.appendChild(numericGrid);
        valueInput._coreSetDisabled = setDisabled;
        rootElement._coreSetDisabled = setDisabled;
        resizeHandler = function () { if (!disposed) render(); };
        if (win && typeof win.ResizeObserver === "function") { resizeObserver = new win.ResizeObserver(resizeHandler); resizeObserver.observe(viewport); }
        else if (win && win.addEventListener) win.addEventListener("resize", resizeHandler);
        render();
        return { root: rootElement, input: valueInput, serialized: serialized, speedHint: speedHint, svg: svg, handles: [handle1, handle2], numeric: numeric, viewButtons: { progress: progressButton, speed: speedButton }, getValue: function () { return cloneValue(value); }, setValue: function (next) { return applyValue(next, null); }, setDisabled: setDisabled, setView: switchView, getView: function () { return view; }, cancel: dragCancel, dispose: function () { disposed = true; clearDrag(); if (resizeObserver) resizeObserver.disconnect(); else if (win && win.removeEventListener) win.removeEventListener("resize", resizeHandler); } };
    }

    function createDisclosureController(options) {
        var trigger = options.trigger;
        var content = options.content;
        var rootElement = options.root || content && content.parentNode;
        var expanded = options.expanded !== false;
        if (!trigger || !content) throw new Error("Disclosure requires trigger and content");
        if (!content.id) throw new Error("Disclosure content requires an id");
        trigger.setAttribute("aria-controls", content.id);
        function setExpanded(nextExpanded, emit) {
            expanded = nextExpanded === true;
            trigger.setAttribute("aria-expanded", expanded ? "true" : "false");
            content.setAttribute("aria-hidden", expanded ? "false" : "true");
            if (rootElement && rootElement.classList) rootElement.classList.toggle(options.collapsedClass || "is-collapsed", !expanded);
            if (emit && typeof options.onChange === "function") options.onChange(expanded);
            return expanded;
        }
        function toggle() { setExpanded(!expanded, true); }
        trigger.addEventListener("click", toggle);
        setExpanded(expanded, false);
        return { trigger: trigger, content: content, isExpanded: function () { return expanded; }, setExpanded: function (nextExpanded) { return setExpanded(nextExpanded, false); }, dispose: function () { trigger.removeEventListener("click", toggle); } };
    }

    function createButton(options) {
        var button = applyCommon(options.document.createElement("button"), options);
        button.type = options.type || "button";
        addClasses(button, "ui-button");
        if (options.variant) addClasses(button, "ui-button--" + options.variant);
        if (options.size) addClasses(button, "ui-button--" + options.size);
        if (options.text !== undefined) button.textContent = options.text;
        listen(button, "click", options.onClick);
        return button;
    }

    function createColorField(options) {
        var doc = options.document;
        var rootElement = applyCommon(doc.createElement("span"), { classNames: "ui-color-field " + (options.classNames || "") });
        var supportsAlpha = options.supportsAlpha === true;
        var normalize = options.normalize || function (value, fallback) { return value || fallback; };
        var fallback = options.fallback || "#ffffff";
        var value = supportsAlpha ? normalizeColorAlphaValue(options.value, { color: fallback, alpha: 1 }) : normalize(options.value, fallback);
        var swatch = createButton({ document: doc, disabled: options.disabled, classNames: "ui-color-swatch " + (options.swatchClassNames || ""), ariaLabel: options.ariaLabel });
        var valueInput = applyCommon(doc.createElement("input"), { id: options.id, disabled: options.disabled, classNames: options.valueClassNames });
        var hex = createTextInput({ document: doc, id: options.hexId || options.id + "Hex", disabled: options.disabled, value: supportsAlpha ? value.color : value, classNames: "ui-color-hex " + (options.hexClassNames || ""), spellcheck: false });
        var alpha = null;
        function cloneColorAlpha(next) { return { color: next.color, alpha: next.alpha }; }
        function setValue(nextValue) {
            var normalized;
            if (supportsAlpha) {
                normalized = normalizeColorAlphaValue(nextValue, value);
                if (!normalized) return cloneColorAlpha(value);
                value = normalized; valueInput.value = JSON.stringify(value); hex.value = value.color; swatch.style.backgroundColor = serializeColorAlphaValue(value);
                if (alpha) alpha.setValue(value.alpha);
                return cloneColorAlpha(value);
            }
            normalized = normalize(nextValue, valueInput.value || fallback);
            valueInput.value = normalized; hex.value = normalized; swatch.style.backgroundColor = normalized;
            return normalized;
        }
        function preview(nextValue) {
            var normalized = setValue(nextValue);
            if (options.onPreview) options.onPreview(normalized);
            return normalized;
        }
        function commit(nextValue) {
            var normalized = setValue(nextValue);
            if (options.onCommit) options.onCommit(normalized);
            return normalized;
        }
        valueInput.type = options.valueType || "hidden";
        valueInput._coreColorFieldSetValue = setValue;
        swatch.setAttribute("data-color-target", options.id || "");
        hex._registryOnValueChange = function () { preview(supportsAlpha ? { color: hex.value, alpha: value.alpha } : hex.value); };
        listen(hex, "input", function () { if (supportsAlpha ? /^#[0-9a-fA-F]{6}$/.test(hex.value) : (!options.isValid || options.isValid(hex.value))) preview(supportsAlpha ? { color: hex.value, alpha: value.alpha } : hex.value); });
        listen(hex, "change", function () { commit(supportsAlpha ? { color: hex.value, alpha: value.alpha } : hex.value); });
        listen(swatch, "click", function (event) {
            if (event) { event.preventDefault(); event.stopPropagation(); }
            if (options.openPicker) options.openPicker({ input: valueInput, hexInput: hex, swatch: swatch, value: supportsAlpha ? value.color : valueInput.value, fallback: fallback, onPreview: supportsAlpha ? function (next) { preview({ color: next, alpha: value.alpha }); } : preview, onCommit: supportsAlpha ? function (next) { commit({ color: next, alpha: value.alpha }); } : commit, onCancel: options.onCancel });
            else if (options.onSwatchClick) options.onSwatchClick(event);
        });
        rootElement.appendChild(swatch); rootElement.appendChild(valueInput); rootElement.appendChild(hex);
        if (supportsAlpha) {
            rootElement.className += " ui-color-field--alpha";
            alpha = createRangeNumber({ document: doc, numberId: options.id + "AlphaNumber", rangeId: options.id + "AlphaRange", value: value.alpha, min: 0, max: 1, step: 0.01, displayStep: 1, valueToDisplay: function (next) { return Math.round(next * 100); }, displayToValue: function (next) { return next / 100; }, unitText: "%", disabled: options.disabled, classNames: "ui-color-alpha", onPreview: function (next) { preview({ color: value.color, alpha: next }); }, onCommit: function (next) { commit({ color: value.color, alpha: next }); } });
            rootElement.appendChild(alpha.root);
        }
        setValue(value);
        return { root: rootElement, swatch: swatch, input: valueInput, hex: hex, alpha: alpha, setValue: setValue, getValue: function () { return supportsAlpha ? cloneColorAlpha(value) : valueInput.value; } };
    }

    function parseColorAlphaValue(input) {
        var match = /^\s*rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*((?:\d+\.?\d*|\.\d+))\s*\)\s*$/i.exec(String(input || ""));
        var channels; var color; var value;
        if (!match) return null;
        channels = [Number(match[1]), Number(match[2]), Number(match[3])];
        value = { color: "", alpha: Number(match[4]) };
        if (channels.some(function (channel) { return !isFinite(channel) || channel < 0 || channel > 255; }) || !isFinite(value.alpha) || value.alpha < 0 || value.alpha > 1) return null;
        color = channels.map(function (channel) { var hex = channel.toString(16); return hex.length < 2 ? "0" + hex : hex; }).join("");
        value.color = "#" + color;
        return value;
    }

    function isValidColorAlphaValue(value) { return !!value && typeof value.color === "string" && /^#[0-9a-fA-F]{6}$/.test(value.color) && typeof value.alpha === "number" && isFinite(value.alpha) && value.alpha >= 0 && value.alpha <= 1; }
    function normalizeColorAlphaValue(value, fallback) {
        var candidate = isValidColorAlphaValue(value) ? value : fallback;
        return isValidColorAlphaValue(candidate) ? { color: candidate.color.toLowerCase(), alpha: Number(candidate.alpha) } : null;
    }
    function serializeColorAlphaValue(value) {
        var normalized = normalizeColorAlphaValue(value, null); var channels;
        if (!normalized) return "";
        channels = [normalized.color.slice(1, 3), normalized.color.slice(3, 5), normalized.color.slice(5, 7)].map(function (part) { return parseInt(part, 16); });
        return "rgba(" + channels.join(", ") + ", " + normalized.alpha + ")";
    }

    function parseShadowValue(value) {
        var match = /^\s*(0|-?(?:\d+\.?\d*|\.\d+)px)\s+(0|-?(?:\d+\.?\d*|\.\d+)px)\s+(0|(?:\d+\.?\d*|\.\d+)px)(?:\s+(0|-?(?:\d+\.?\d*|\.\d+)px))?\s+rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*((?:\d+\.?\d*|\.\d+))\s*\)\s*$/i.exec(String(value || ""));
        var result;
        if (!match) return null;
        result = { offsetX: parseFloat(match[1]), offsetY: parseFloat(match[2]), blur: parseFloat(match[3]), spread: match[4] === undefined ? 0 : parseFloat(match[4]), color: "#" + [match[5], match[6], match[7]].map(function (part) { var hex = Number(part).toString(16); return hex.length < 2 ? "0" + hex : hex; }).join(""), alpha: Number(match[8]) };
        return isValidShadowValue(result) ? result : null;
    }

    function isValidShadowValue(value) {
        return !!value && ["offsetX", "offsetY", "blur", "spread", "alpha"].every(function (key) { return typeof value[key] === "number" && isFinite(value[key]); }) && value.blur >= 0 && value.alpha >= 0 && value.alpha <= 1 && /^#[0-9a-f]{6}$/i.test(value.color || "");
    }

    function serializeShadowValue(value) {
        var rgb;
        if (!isValidShadowValue(value)) return "";
        rgb = [value.color.slice(1, 3), value.color.slice(3, 5), value.color.slice(5, 7)].map(function (part) { return parseInt(part, 16); });
        return value.offsetX + "px " + value.offsetY + "px " + value.blur + "px" + (value.spread ? " " + value.spread + "px" : "") + " rgba(" + rgb.join(", ") + ", " + value.alpha + ")";
    }

    function createShadowField(options) {
        var doc = options.document; var sourceValue = options.value; var value = isValidShadowValue(sourceValue) ? { offsetX: sourceValue.offsetX, offsetY: sourceValue.offsetY, blur: sourceValue.blur, spread: sourceValue.spread, color: sourceValue.color, alpha: sourceValue.alpha } : { offsetX: 0, offsetY: 0, blur: 0, spread: 0, color: "#000000", alpha: 0 }; var labels = options.labels || {}; var rootElement = applyCommon(doc.createElement("div"), { classNames: "ui-shadow-field " + (options.classNames || "") }); var inputs = {}; var color;
        function clone() { return { offsetX: value.offsetX, offsetY: value.offsetY, blur: value.blur, spread: value.spread, color: value.color, alpha: value.alpha }; }
        function setValue(next) {
            var key;
            if (!isValidShadowValue(next)) return clone();
            value = { offsetX: next.offsetX, offsetY: next.offsetY, blur: next.blur, spread: next.spread, color: next.color, alpha: next.alpha };
            for (key in inputs) if (Object.prototype.hasOwnProperty.call(inputs, key)) inputs[key].value = String(value[key]);
            color.setValue(value.color);
            return clone();
        }
        function emit(kind) { if (typeof options[kind] === "function") options[kind](clone()); }
        function createSubfield(key, control, labelTag) {
            var wrapper = applyCommon(doc.createElement("div"), { classNames: "ui-shadow-subfield ui-shadow-subfield--" + key });
            var label = applyCommon(doc.createElement(labelTag || "label"), { classNames: "ui-shadow-subfield-label" });
            label.textContent = labels[key] || key;
            if (labelTag !== "span") label.setAttribute("for", control.id);
            else { wrapper.setAttribute("role", "group"); wrapper.setAttribute("aria-label", label.textContent); }
            wrapper.appendChild(label); wrapper.appendChild(control); rootElement.appendChild(wrapper);
            return wrapper;
        }
        function addNumber(key, min, max, step) {
            var input;
            var field = { min: min, max: max, step: step, defaultValue: value[key] };
            function preview(next) { value[key] = normalizeNumber(next, field, value[key]); emit("onPreview"); }
            function commit(next) { value[key] = normalizeNumber(next, field, value[key]); emit("onCommit"); }
            input = createNumberInput({ document: doc, id: options.id + "-" + key, value: value[key], field: field, ariaLabel: labels[key] || key, onInput: function () { if (!isNumberDraft(input.value)) preview(input.value); }, onDragValue: preview, onCommit: commit, onCancel: function (restored) { value[key] = normalizeNumber(restored, field, value[key]); if (typeof options.onCancel === "function") options.onCancel(clone()); }, onDragEnd: function () { commit(input.value); } });
            inputs[key] = input; createSubfield(key, input);
        }
        addNumber("offsetX", undefined, undefined, 1); addNumber("offsetY", undefined, undefined, 1); addNumber("blur", 0, undefined, 1); addNumber("spread", undefined, undefined, 1);
        color = createColorField({ document: doc, id: options.id + "-color", value: value.color, fallback: "#000000", ariaLabel: labels.color || "color", normalize: function (next, fallback) { return /^#[0-9a-f]{6}$/i.test(next || "") ? next : fallback; }, isValid: function (next) { return /^#[0-9a-f]{6}$/i.test(next || ""); }, openPicker: options.openPicker, onPreview: function (next) { value.color = next; emit("onPreview"); }, onCommit: function (next) { value.color = next; emit("onCommit"); }, onCancel: function () { if (typeof options.onCancel === "function") options.onCancel(clone()); } });
        createSubfield("color", color.root, "span"); addNumber("alpha", 0, 1, 0.01);
        return { root: rootElement, inputs: inputs, color: color, getValue: clone, setValue: setValue };
    }

    function createFieldRow(options) {
        var doc = options.document;
        var row = applyCommon(doc.createElement(options.labelRow ? "label" : "div"), { classNames: "ui-field-row " + (options.classNames || "") });
        var copy = applyCommon(doc.createElement(options.copyTag || "span"), { classNames: "ui-field-copy " + (options.copyClassNames || "") });
        var label = applyCommon(doc.createElement(options.labelTag || "strong"), { classNames: "ui-field-label " + (options.labelClassNames || "") });
        var hint;
        if (options.contentGrowth === true) row.className += " is-content-growth";
        label.textContent = options.labelText || "";
        if (options.labelKey) label.setAttribute("data-i18n", options.labelKey);
        if (options.labelFor) copy.setAttribute("for", options.labelFor);
        copy.appendChild(label);
        if (options.descriptionText || options.descriptionKey) {
            hint = applyCommon(doc.createElement("small"), { classNames: "ui-field-description " + (options.descriptionClassNames || "") });
            hint.textContent = options.descriptionText || "";
            if (options.descriptionKey) hint.setAttribute("data-i18n", options.descriptionKey);
            copy.appendChild(hint);
        }
        row.appendChild(copy);
        if (options.control) row.appendChild(options.control);
        return { row: row, copy: copy, label: label, description: hint || null };
    }

    return {
        addClasses: addClasses,
        createTextInput: createTextInput,
        createTextarea: createTextarea,
        createNumberInput: createNumberInput,
        createRangeNumber: createRangeNumber,
        createSelect: createSelect,
        enhanceSelect: enhanceSelect,
        closeSelectComponents: closeSelectComponents,
        createSwitch: createSwitch,
        createCheckbox: createCheckbox,
        createChoiceGroup: createChoiceGroup,
        createBezierCurveField: createBezierCurveField,
        createDisclosureController: createDisclosureController,
        createButton: createButton,
        createColorField: createColorField,
        parseColorAlphaValue: parseColorAlphaValue,
        isValidColorAlphaValue: isValidColorAlphaValue,
        normalizeColorAlphaValue: normalizeColorAlphaValue,
        serializeColorAlphaValue: serializeColorAlphaValue,
        parseShadowValue: parseShadowValue,
        isValidShadowValue: isValidShadowValue,
        serializeShadowValue: serializeShadowValue,
        createShadowField: createShadowField,
        createFieldRow: createFieldRow,
        normalizeNumber: normalizeNumber,
        isNumberDraft: isNumberDraft,
        setNumberValue: setNumberValue,
        bindNumberDrag: bindNumberDrag,
        isValidBezierValue: isValidBezierValue,
        normalizeBezierValue: normalizeBezierValue,
        parseCubicBezier: parseCubicBezier,
        serializeCubicBezier: serializeCubicBezier,
        sampleBezier: sampleBezier,
        sampleBezierSpeed: sampleBezierSpeed,
        bezierSpeedProjection: bezierSpeedProjection
    };
}));
