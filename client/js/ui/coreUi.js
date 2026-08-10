(function (root, factory) {
    var exported = factory(root);
    if (root && root.document) root.CoreUI = exported;
    else if (typeof module === "object" && module.exports) module.exports = exported;
}(typeof window !== "undefined" ? window : this, function (root) {
    "use strict";

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
        input.value = options.value === null || options.value === undefined ? "" : String(options.value);
        addClasses(input, "ui-textarea");
        if (typeof options.rows === "number") input.rows = options.rows;
        if (options.placeholder) input.placeholder = options.placeholder;
        listen(input, "input", options.onInput);
        listen(input, "change", options.onCommit);
        return input;
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
        var number = createNumberInput({ document: doc, id: options.numberId, type: options.numberType || "number", value: options.value, min: options.min, max: options.max, step: options.step, field: options.field || options, classNames: options.numberClassNames, onDragValue: options.onNumberDrag, onCommit: options.onNumberCommit, onCancel: options.onNumberCancel, onDragStart: options.onDragStart, onDragChange: options.onDragChange, onDragEnd: options.onDragEnd });
        var range = applyCommon(doc.createElement("input"), { id: options.rangeId, classNames: "ui-range " + (options.rangeClassNames || "") });
        range.type = "range"; range.min = options.min; range.max = options.max; range.step = options.step; range.value = options.value;
        wrap.appendChild(number); wrap.appendChild(range);
        return { root: wrap, range: range, number: number };
    }

    function createSelect(options) {
        var select = applyCommon(options.document.createElement("select"), options);
        addClasses(select, "ui-select");
        listen(select, "change", options.onChange);
        return select;
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

    function createButton(options) {
        var button = applyCommon(options.document.createElement("button"), options);
        button.type = options.type || "button";
        addClasses(button, "ui-button");
        if (options.variant) addClasses(button, "ui-button--" + options.variant);
        if (options.text !== undefined) button.textContent = options.text;
        listen(button, "click", options.onClick);
        return button;
    }

    function createColorField(options) {
        var doc = options.document;
        var rootElement = applyCommon(doc.createElement("span"), { classNames: "ui-color-field " + (options.classNames || "") });
        var normalize = options.normalize || function (value, fallback) { return value || fallback; };
        var fallback = options.fallback || "#ffffff";
        var value = normalize(options.value, fallback);
        var swatch = createButton({ document: doc, disabled: options.disabled, classNames: "ui-color-swatch " + (options.swatchClassNames || ""), ariaLabel: options.ariaLabel });
        var valueInput = applyCommon(doc.createElement("input"), { id: options.id, disabled: options.disabled, classNames: options.valueClassNames });
        var hex = createTextInput({ document: doc, id: options.hexId || options.id + "Hex", disabled: options.disabled, value: value, classNames: "ui-color-hex " + (options.hexClassNames || ""), spellcheck: false });
        function setValue(nextValue) {
            var normalized = normalize(nextValue, valueInput.value || fallback);
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
        hex._registryOnValueChange = function () { preview(hex.value); };
        listen(hex, "input", function () { if (!options.isValid || options.isValid(hex.value)) preview(hex.value); });
        listen(hex, "change", function () { commit(hex.value); });
        listen(swatch, "click", function (event) {
            if (event) { event.preventDefault(); event.stopPropagation(); }
            if (options.openPicker) options.openPicker({ input: valueInput, hexInput: hex, swatch: swatch, value: valueInput.value, fallback: fallback, onPreview: preview, onCommit: commit, onCancel: options.onCancel });
            else if (options.onSwatchClick) options.onSwatchClick(event);
        });
        rootElement.appendChild(swatch); rootElement.appendChild(valueInput); rootElement.appendChild(hex);
        setValue(value);
        return { root: rootElement, swatch: swatch, input: valueInput, hex: hex, setValue: setValue };
    }

    function createFieldRow(options) {
        var doc = options.document;
        var row = applyCommon(doc.createElement(options.labelRow ? "label" : "div"), { classNames: "ui-field-row " + (options.classNames || "") });
        var copy = applyCommon(doc.createElement("span"), { classNames: "ui-field-copy " + (options.copyClassNames || "") });
        var label = applyCommon(doc.createElement(options.labelTag || "strong"), { classNames: "ui-field-label " + (options.labelClassNames || "") });
        var hint;
        if (options.contentGrowth === true) row.className += " is-content-growth";
        label.textContent = options.labelText || "";
        if (options.labelKey) label.setAttribute("data-i18n", options.labelKey);
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
        createSwitch: createSwitch,
        createButton: createButton,
        createColorField: createColorField,
        createFieldRow: createFieldRow,
        normalizeNumber: normalizeNumber,
        isNumberDraft: isNumberDraft,
        setNumberValue: setNumberValue,
        bindNumberDrag: bindNumberDrag
    };
}));
