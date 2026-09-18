(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });
  var __commonJS = (cb, mod) => function __require2() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // client/js/ui/coreUi.js
  var require_coreUi = __commonJS({
    "client/js/ui/coreUi.js"(exports, module) {
      (function(root2, factory) {
        var exported = factory(root2);
        if (root2 && root2.document) root2.CoreUI = exported;
        else if (typeof module === "object" && module.exports) module.exports = exported;
      })(typeof window !== "undefined" ? window : exports, function(root2) {
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
        function listen(element, name2, callback) {
          if (typeof callback === "function") element.addEventListener(name2, callback);
        }
        function isNode(value2) {
          return !!value2 && typeof value2 === "object" && typeof value2.nodeType === "number";
        }
        function createTextInput(options) {
          var doc = options.document;
          var input = applyCommon(doc.createElement("input"), options);
          input.type = options.type || "text";
          input.value = options.value === null || options.value === void 0 ? "" : String(options.value);
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
          input.value = options.value === null || options.value === void 0 ? "" : String(options.value);
          addClasses(input, "ui-textarea ui-editable-scroll");
          if (typeof options.rows === "number") input.rows = options.rows;
          if (options.placeholder) input.placeholder = options.placeholder;
          listen(input, "input", options.onInput);
          listen(input, "change", options.onCommit);
          frame.appendChild(input);
          if (direction !== "none") {
            grip = applyCommon(doc.createElement("span"), { classNames: "ui-resize-grip", ariaLabel: options.resizeAriaLabel || "Resize" });
            grip.setAttribute("role", "presentation");
            frame.appendChild(grip);
            cleanup = bindResizeGrip({ grip, frame, direction, minWidth: options.minWidth, maxWidth: options.maxWidth, minHeight: options.minHeight, maxHeight: options.maxHeight });
          }
          input._coreFrame = frame;
          input._coreResizeGrip = grip;
          input._coreDispose = function() {
            if (cleanup) cleanup();
          };
          return input;
        }
        function bindResizeGrip(options) {
          var grip = options.grip;
          var frame = options.frame;
          var direction = options.direction;
          var doc = grip.ownerDocument;
          var win = doc.defaultView || root2;
          var activePointer = null;
          function clamp4(value2, min, max) {
            if (typeof min === "number") value2 = Math.max(min, value2);
            if (typeof max === "number") value2 = Math.min(max, value2);
            return value2;
          }
          function down(event) {
            var startX;
            var startY;
            var startWidth;
            var startHeight;
            var parent2;
            if (!event || event.button !== 0) return;
            startX = event.clientX;
            startY = event.clientY;
            startWidth = frame.offsetWidth;
            startHeight = frame.offsetHeight;
            parent2 = frame.parentNode;
            activePointer = event.pointerId;
            if (grip.setPointerCapture && activePointer !== void 0) grip.setPointerCapture(activePointer);
            doc.body.classList.add("is-resizing-ui-surface");
            event.preventDefault();
            event.stopPropagation();
            function move(moveEvent) {
              var maxWidth = typeof options.maxWidth === "number" ? options.maxWidth : parent2 && parent2.clientWidth ? parent2.clientWidth : null;
              var maxHeight = typeof options.maxHeight === "number" ? options.maxHeight : null;
              if (direction === "horizontal" || direction === "both") frame.style.width = clamp4(startWidth + moveEvent.clientX - startX, options.minWidth || 0, maxWidth) + "px";
              if (direction === "vertical" || direction === "both") frame.style.height = clamp4(startHeight + moveEvent.clientY - startY, options.minHeight || 0, maxHeight) + "px";
              moveEvent.preventDefault();
            }
            function end(endEvent) {
              doc.removeEventListener("pointermove", move);
              doc.removeEventListener("pointerup", end);
              doc.removeEventListener("pointercancel", end);
              win.removeEventListener("blur", end);
              if (grip.releasePointerCapture && activePointer !== null && grip.hasPointerCapture && grip.hasPointerCapture(activePointer)) grip.releasePointerCapture(activePointer);
              activePointer = null;
              doc.body.classList.remove("is-resizing-ui-surface");
              if (endEvent && endEvent.preventDefault) endEvent.preventDefault();
            }
            doc.addEventListener("pointermove", move);
            doc.addEventListener("pointerup", end);
            doc.addEventListener("pointercancel", end);
            win.addEventListener("blur", end);
          }
          grip.addEventListener("pointerdown", down);
          return function() {
            grip.removeEventListener("pointerdown", down);
            doc.body.classList.remove("is-resizing-ui-surface");
          };
        }
        function normalizeNumber(value2, field2, fallback) {
          var numeric = Number(value2);
          var min = field2 && typeof field2.min !== "undefined" ? Number(field2.min) : null;
          var max = field2 && typeof field2.max !== "undefined" ? Number(field2.max) : null;
          if (isNaN(numeric)) numeric = Number(fallback);
          if (isNaN(numeric)) numeric = Number(field2 && field2.defaultValue);
          if (isNaN(numeric)) numeric = 0;
          if (min !== null && !isNaN(min)) numeric = Math.max(min, numeric);
          if (max !== null && !isNaN(max)) numeric = Math.min(max, numeric);
          return numeric;
        }
        function isNumberDraft(value2) {
          var text2 = String(value2 || "").replace(/^\s+|\s+$/g, "");
          return text2 === "" || text2 === "-" || text2 === "+" || text2 === "." || text2 === "-." || text2 === "+." || /\.$/.test(text2);
        }
        function setNumberValue(input, value2, field2, fallback) {
          var step = field2 && typeof field2.step !== "undefined" ? Number(field2.step) : 1;
          var numeric = normalizeNumber(value2, field2, fallback);
          var decimals = 0;
          var stepText;
          if (!isNaN(step) && step > 0) {
            stepText = String(step);
            if (stepText.indexOf(".") >= 0) decimals = stepText.length - stepText.indexOf(".") - 1;
          }
          input.value = decimals > 0 ? numeric.toFixed(decimals) : String(Math.round(numeric));
          return input.value;
        }
        function bindNumberDrag(input, field2, onUpdate, options) {
          var suppressNextClick = false;
          var editStartValue = input.value;
          var skipNextBlurCommit = false;
          var hasOptions = !!options;
          options = options || {};
          addClasses(input, "ui-number-input registry-number-input is-drag-ready");
          input.addEventListener("focus", function() {
            editStartValue = input.value;
            input.classList.add("is-editing-number");
          });
          input.addEventListener("blur", function() {
            input.classList.remove("is-editing-number");
            if (options.onCommit && !skipNextBlurCommit) options.onCommit(setNumberValue(input, input.value, field2, editStartValue));
            skipNextBlurCommit = false;
          });
          input.addEventListener("click", function(event) {
            if (suppressNextClick) {
              suppressNextClick = false;
              event.preventDefault();
              return;
            }
            input.classList.add("is-editing-number");
            try {
              input.select();
            } catch (ignored) {
            }
          });
          input.addEventListener("keydown", function(event) {
            var direction;
            var step;
            var current;
            if (event.keyCode === 13) {
              if (options.onCommit) {
                options.onCommit(setNumberValue(input, input.value, field2, editStartValue));
                skipNextBlurCommit = true;
              }
              input.blur();
            } else if (event.keyCode === 27) {
              if (options.onCancel) {
                event.preventDefault();
                event.stopPropagation();
                setNumberValue(input, editStartValue, field2, editStartValue);
                options.onCancel(input.value);
                skipNextBlurCommit = true;
              }
              input.blur();
            } else if (hasOptions && options.enableArrowKeys !== false && (event.keyCode === 38 || event.keyCode === 40)) {
              direction = event.keyCode === 38 ? 1 : -1;
              step = Number(field2.step);
              current = normalizeNumber(input.value, field2, editStartValue);
              event.preventDefault();
              event.stopPropagation();
              if (isNaN(step) || step <= 0) step = 1;
              setNumberValue(input, current + direction * step, field2, editStartValue);
              if (onUpdate) onUpdate(input.value);
            }
          });
          input.addEventListener("mousedown", function(event) {
            var startX, startValue, step, dragging = false, previousUserSelect;
            var doc = input.ownerDocument;
            var win = doc.defaultView || root2;
            if (event.button !== 0 || input.classList.contains("is-editing-number") || doc.activeElement === input) return;
            startX = event.clientX;
            startValue = normalizeNumber(input.value, field2, field2.defaultValue);
            step = Number(field2.step);
            if (isNaN(step) || step <= 0) step = 1;
            previousUserSelect = doc.body.style.userSelect;
            function move(moveEvent) {
              var delta = moveEvent.clientX - startX;
              if (Math.abs(delta) < 4 && !dragging) return;
              if (!dragging && options.onDragStart) options.onDragStart();
              dragging = true;
              input.blur();
              input.classList.remove("is-editing-number");
              input.classList.add("is-dragging-number");
              doc.body.style.userSelect = "none";
              moveEvent.preventDefault();
              setNumberValue(input, startValue + delta / 8 * step, field2, startValue);
              if (onUpdate) onUpdate(input.value);
              if (options.onDragChange) options.onDragChange(input.value);
            }
            function up() {
              doc.removeEventListener("mousemove", move);
              doc.removeEventListener("mouseup", up);
              win.removeEventListener("blur", up);
              doc.body.style.userSelect = previousUserSelect;
              input.classList.remove("is-dragging-number");
              if (dragging) {
                suppressNextClick = true;
                win.setTimeout(function() {
                  suppressNextClick = false;
                }, 0);
                if (onUpdate) onUpdate(input.value);
                if (options.onDragEnd) options.onDragEnd();
              }
            }
            doc.addEventListener("mousemove", move);
            doc.addEventListener("mouseup", up);
            win.addEventListener("blur", up);
          });
          return input;
        }
        function createNumberInput(options) {
          var input = applyCommon(options.document.createElement("input"), options);
          input.type = options.type || "text";
          input.inputMode = options.inputMode || "decimal";
          input.value = options.value === null || options.value === void 0 ? "" : String(options.value);
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
          var valueToDisplay = typeof options.valueToDisplay === "function" ? options.valueToDisplay : function(value2) {
            return value2;
          };
          var displayToValue = typeof options.displayToValue === "function" ? options.displayToValue : function(value2) {
            return Number(value2);
          };
          var displayMin = valueToDisplay(options.min);
          var displayMax = valueToDisplay(options.max);
          var trackMin = valueToDisplay(typeof options.trackMin !== "undefined" ? options.trackMin : options.min);
          var trackMax = valueToDisplay(typeof options.trackMax !== "undefined" ? options.trackMax : options.max);
          var displayStep = typeof options.displayStep !== "undefined" ? options.displayStep : options.step;
          var displayValue = valueToDisplay(options.value);
          var usesPresentationAdapter = typeof options.valueToDisplay === "function" || typeof options.displayToValue === "function" || typeof options.displayStep !== "undefined" || typeof options.onPreview === "function" || typeof options.onCommit === "function";
          var numberField = usesPresentationAdapter ? { min: displayMin, max: displayMax, step: displayStep, defaultValue: displayValue } : options.field || options;
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
          number = createNumberInput({ document: doc, id: options.numberId, type: options.numberType || "number", value: displayValue, min: displayMin, max: displayMax, step: displayStep, field: numberField, disabled: options.disabled, classNames: options.numberClassNames, onInput: options.onPreview ? function() {
            if (!isNumberDraft(number.value)) preview(number.value);
          } : options.onNumberInput, onDragValue: options.onPreview ? preview : options.onNumberDrag, onCommit: options.onCommit ? commit : options.onNumberCommit, onCancel: options.onCancel ? function() {
            options.onCancel();
          } : options.onNumberCancel, onDragStart: options.onDragStart, onDragChange: options.onDragChange, onDragEnd: options.onCommit ? function() {
            commit(number.value);
            if (options.onDragEnd) options.onDragEnd();
          } : options.onDragEnd });
          range.disabled = options.disabled === true;
          range.type = "range";
          range.min = trackMin;
          range.max = trackMax;
          range.step = displayStep;
          range.value = displayValue;
          if (options.onPreview) listen(range, "input", function() {
            preview(range.value);
          });
          if (options.onCommit) listen(range, "change", function() {
            commit(range.value);
          });
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
          return { root: wrap, range, number, unit: unit || null, valueCluster: valueCluster || null, setValue: function(modelValue) {
            return syncDisplay(valueToDisplay(modelValue));
          } };
        }
        function createSelect(options) {
          var select = applyCommon(options.document.createElement("select"), options);
          addClasses(select, "ui-select");
          listen(select, "change", options.onChange);
          return select;
        }
        function closeSelectComponents(exceptComponent) {
          var wasOpen = !!activeSelectComponent && activeSelectComponent !== exceptComponent;
          var components = selectComponents.slice(0);
          var i;
          for (i = 0; i < components.length; i++) {
            if (components[i] !== exceptComponent) components[i].close();
          }
          return wasOpen;
        }
        function renderAssetPersistenceNotice(options) {
          var owner = options.owner;
          var mount2 = options.mount;
          var doc = options.document;
          if (!owner || !mount2) return;
          var state = owner.getPersistenceState();
          var notice = mount2.querySelector(".asset-persistence-notice");
          if (notice && notice.parentNode) notice.parentNode.removeChild(notice);
          if (!state.dirty || !state.error) return;
          notice = doc.createElement("div");
          notice.className = "asset-persistence-notice";
          notice.setAttribute("role", "status");
          var label2 = doc.createElement("span");
          label2.setAttribute("data-i18n", "assets.notSaved");
          label2.textContent = options.translate("assets.notSaved");
          notice.appendChild(label2);
          function button2(key, action, disabled) {
            var control = createButton({ document: doc, variant: "neutral", text: options.translate(key), classNames: "panel-button panel-local-action", onClick: function() {
              action();
              renderAssetPersistenceNotice(options);
              if (options.onChange) options.onChange();
            } });
            control.setAttribute("data-i18n", key);
            control.disabled = !!disabled;
            notice.appendChild(control);
          }
          button2("common.retry", owner.retrySave);
          button2(state.canRestore ? "assets.restoreSaved" : "assets.noSavedBaseline", owner.restoreSaved, !state.canRestore);
          mount2.insertBefore(notice, mount2.firstChild);
        }
        function enhanceSelect(options) {
          options = options || {};
          var select = options.select;
          var doc = options.document || select && select.ownerDocument;
          var win = doc && (doc.defaultView || root2);
          var componentId;
          var control;
          var trigger;
          var label2;
          var chevron;
          var menu;
          var viewport;
          var disposed = false;
          var component;
          if (!select || !doc || !select.parentNode) throw new Error("CoreUI.enhanceSelect requires a mounted native select");
          if (select._coreSelectComponent) return select._coreSelectComponent;
          selectComponentCounter += 1;
          componentId = select.id || "coreSelect" + selectComponentCounter;
          componentId += "-" + selectComponentCounter;
          control = applyCommon(doc.createElement("span"), { classNames: "custom-select select-input-replacement " + (options.controlClassNames || "") });
          control.setAttribute("data-select-for", componentId);
          trigger = applyCommon(doc.createElement("button"), { classNames: "select-trigger", disabled: select.disabled === true });
          trigger.type = "button";
          trigger.setAttribute("aria-haspopup", "listbox");
          trigger.setAttribute("aria-expanded", "false");
          trigger.setAttribute("aria-controls", componentId + "-menu");
          label2 = applyCommon(doc.createElement("span"), { classNames: "select-label" });
          chevron = applyCommon(doc.createElement("span"), { classNames: "select-chevron" });
          chevron.setAttribute("aria-hidden", "true");
          trigger.appendChild(label2);
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
          function close(restoreFocus2) {
            if (disposed) return;
            control.classList.remove("is-open");
            menu.classList.remove("is-open");
            trigger.setAttribute("aria-expanded", "false");
            resetMenuGeometry();
            if (activeSelectComponent === component) activeSelectComponent = null;
            if (restoreFocus2 === true && trigger.focus) trigger.focus();
          }
          function position() {
            var rect = typeof options.getControlRect === "function" ? options.getControlRect(control) : control.getBoundingClientRect();
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
            label2.textContent = optionLabel(option);
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
          function setValue(value2, notify) {
            select.value = value2;
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
              optionButton.addEventListener("click", function() {
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
            var selected2 = viewport.querySelector(".select-option.is-selected");
            var selectedIndex = 0;
            var nextIndex;
            var i;
            for (i = 0; i < buttons.length; i++) if (buttons[i] === selected2) selectedIndex = i;
            if (event.keyCode === 13 || event.keyCode === 32) {
              event.preventDefault();
              if (control.classList.contains("is-open")) close();
              else open();
            } else if (event.keyCode === 27 && control.classList.contains("is-open")) {
              event.preventDefault();
              event.stopPropagation();
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
          function selectChange() {
            sync();
          }
          function outsideClick(event) {
            var target = event && event.target;
            if (!isNode(target)) {
              close();
              return;
            }
            if (!control.contains(target) && !menu.contains(target)) close();
          }
          function viewportChange(event) {
            var target = event && event.target;
            if (target && isNode(target) && menu.contains(target)) return;
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
          component = { id: "select", variant: "custom-portal", select, root: control, trigger, menu, viewport, open, close, sync, rebuild, setValue, setDisabled: function(disabled) {
            select.disabled = disabled === true;
            sync();
          }, dispose };
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
          input.type = "checkbox";
          input.checked = options.checked === true;
          track.className = "switch-track ui-switch-track";
          if (options.label === true && options.id) rootElement.setAttribute("for", options.id);
          listen(input, "change", options.onChange);
          rootElement.appendChild(input);
          rootElement.appendChild(track);
          return { root: rootElement, input, track };
        }
        function createCheckbox(options) {
          var doc = options.document;
          var rootElement = applyCommon(doc.createElement("label"), { classNames: "ui-checkbox " + (options.classNames || "") });
          var input = applyCommon(doc.createElement("input"), { id: options.id, disabled: options.disabled, ariaLabel: options.ariaLabel });
          var mark = doc.createElement("span");
          var text2;
          input.type = "checkbox";
          input.checked = options.checked === true;
          mark.className = "ui-checkbox-mark";
          mark.setAttribute("aria-hidden", "true");
          listen(input, "change", options.onChange);
          rootElement.appendChild(input);
          rootElement.appendChild(mark);
          if (options.labelText !== void 0) {
            text2 = doc.createElement("span");
            text2.className = "ui-checkbox-label";
            text2.textContent = String(options.labelText);
            rootElement.appendChild(text2);
          }
          return { root: rootElement, input, mark, label: text2 || null };
        }
        function createChoiceGroup(options) {
          var doc = options.document;
          var rootElement = applyCommon(doc.createElement("div"), { classNames: "ui-choice-group " + (options.classNames || ""), ariaLabel: options.ariaLabel });
          var input = applyCommon(doc.createElement("input"), { id: options.id });
          var optionSpecs = options.options || [];
          var buttons = [];
          var value2 = String(options.value === void 0 || options.value === null ? "" : options.value);
          var groupDisabled = options.disabled === true;
          var i;
          rootElement.setAttribute("role", "radiogroup");
          rootElement.setAttribute("aria-disabled", groupDisabled ? "true" : "false");
          input.type = "hidden";
          input.value = value2;
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
            value2 = String(nextValue);
            input.value = value2;
            for (index = 0; index < buttons.length; index++) {
              if (buttons[index].getAttribute("data-choice-value") === value2) selectedIndex = index;
            }
            for (index = 0; index < buttons.length; index++) {
              buttons[index].setAttribute("aria-checked", index === selectedIndex ? "true" : "false");
              buttons[index].classList.toggle("is-active", index === selectedIndex);
              buttons[index].tabIndex = index === selectedIndex || selectedIndex < 0 && !buttons[index].disabled ? 0 : -1;
              if (selectedIndex < 0 && buttons[index].tabIndex === 0) selectedIndex = index;
            }
            if (emit && typeof options.onChange === "function") options.onChange(value2);
            return value2;
          }
          function selectButton(button2, focus) {
            if (!button2 || button2.disabled) return;
            sync(button2.getAttribute("data-choice-value"), true);
            if (focus && typeof button2.focus === "function") button2.focus();
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
            if (target >= 0) {
              event.preventDefault();
              selectButton(buttons[target], true);
            }
          }
          for (i = 0; i < optionSpecs.length; i++) {
            (function(spec) {
              var button2 = createButton({ document: doc, disabled: groupDisabled || spec.disabled === true, classNames: "ui-choice-surface " + (spec.classNames || "") });
              var label2;
              var description;
              button2.setAttribute("role", "radio");
              button2.setAttribute("data-choice-value", String(spec.value));
              button2.setAttribute("aria-disabled", groupDisabled || spec.disabled === true ? "true" : "false");
              if (spec.disabled === true) button2.setAttribute("data-core-intrinsic-disabled", "true");
              if (typeof options.renderOption === "function") options.renderOption(button2, spec);
              else {
                label2 = doc.createElement("strong");
                label2.className = "ui-choice-label";
                label2.textContent = spec.label || String(spec.value);
                button2.appendChild(label2);
                if (spec.description) {
                  description = doc.createElement("small");
                  description.className = "ui-choice-description";
                  description.textContent = spec.description;
                  button2.appendChild(description);
                }
              }
              listen(button2, "click", function() {
                selectButton(button2, false);
              });
              listen(button2, "keydown", handleKey);
              buttons.push(button2);
              rootElement.appendChild(button2);
            })(optionSpecs[i]);
          }
          sync(value2, false);
          return { root: rootElement, input, options: buttons, getValue: function() {
            return value2;
          }, setValue: function(nextValue) {
            return sync(nextValue, false);
          } };
        }
        var BEZIER_PRECISION = 4;
        var BEZIER_EPSILON = 1e-4;
        function roundBezierNumber(value2) {
          var factor = Math.pow(10, BEZIER_PRECISION);
          var rounded = Math.round(Number(value2) * factor) / factor;
          return Math.abs(rounded) < 1 / factor ? 0 : rounded;
        }
        function isValidBezierValue(value2) {
          return !!value2 && isFinite(Number(value2.x1)) && isFinite(Number(value2.y1)) && isFinite(Number(value2.x2)) && isFinite(Number(value2.y2)) && Number(value2.x1) >= 0 && Number(value2.x1) <= 1 && Number(value2.x2) >= 0 && Number(value2.x2) <= 1;
        }
        function normalizeBezierValue(value2, fallback) {
          var source = isValidBezierValue(value2) ? value2 : isValidBezierValue(fallback) ? fallback : { x1: 0.25, y1: 0.1, x2: 0.25, y2: 1 };
          return { x1: roundBezierNumber(source.x1), y1: roundBezierNumber(source.y1), x2: roundBezierNumber(source.x2), y2: roundBezierNumber(source.y2) };
        }
        function parseCubicBezier(text2) {
          var match = /^\s*cubic-bezier\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*\)\s*$/i.exec(String(text2 || ""));
          var value2;
          var numericPattern = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i;
          if (!match) return null;
          if (!numericPattern.test(match[1].replace(/^\s+|\s+$/g, "")) || !numericPattern.test(match[2].replace(/^\s+|\s+$/g, "")) || !numericPattern.test(match[3].replace(/^\s+|\s+$/g, "")) || !numericPattern.test(match[4].replace(/^\s+|\s+$/g, ""))) return null;
          value2 = { x1: Number(match[1]), y1: Number(match[2]), x2: Number(match[3]), y2: Number(match[4]) };
          return isValidBezierValue(value2) ? normalizeBezierValue(value2) : null;
        }
        function serializeCubicBezier(value2) {
          var normalized = isValidBezierValue(value2) ? normalizeBezierValue(value2) : null;
          return normalized ? "cubic-bezier(" + normalized.x1 + ", " + normalized.y1 + ", " + normalized.x2 + ", " + normalized.y2 + ")" : "";
        }
        function sampleBezier(value2, u) {
          var inverse = 1 - u;
          return {
            x: 3 * inverse * inverse * u * value2.x1 + 3 * inverse * u * u * value2.x2 + u * u * u,
            y: 3 * inverse * inverse * u * value2.y1 + 3 * inverse * u * u * value2.y2 + u * u * u
          };
        }
        function sampleBezierSpeed(value2, u) {
          var inverse = 1 - u;
          var dx = 3 * inverse * inverse * value2.x1 + 6 * inverse * u * (value2.x2 - value2.x1) + 3 * u * u * (1 - value2.x2);
          var dy = 3 * inverse * inverse * value2.y1 + 6 * inverse * u * (value2.y2 - value2.y1) + 3 * u * u * (1 - value2.y2);
          if (Math.abs(dx) < BEZIER_EPSILON) return null;
          return isFinite(dy / dx) ? dy / dx : null;
        }
        function bezierSpeedProjection(value2) {
          var startInfluence = value2.x1;
          var endInfluence = 1 - value2.x2;
          return {
            startInfluence,
            startSpeed: startInfluence > BEZIER_EPSILON ? value2.y1 / startInfluence : null,
            endInfluence,
            endSpeed: endInfluence > BEZIER_EPSILON ? (1 - value2.y2) / endInfluence : null
          };
        }
        function createBezierCurveField(options) {
          var doc = options.document;
          var win = doc.defaultView || root2;
          var disabled = options.disabled === true;
          var readonly = options.readonly === true;
          var value2 = normalizeBezierValue(options.value, options.defaultValue);
          var editSnapshot = normalizeBezierValue(value2);
          var activeDrag = null;
          var disposed = false;
          var view2 = options.initialView === "speed" ? "speed" : "progress";
          var rootElement = applyCommon(doc.createElement("div"), { classNames: "ui-bezier-field " + (options.classNames || "") });
          var valueInput = applyCommon(doc.createElement("input"), { id: options.id, disabled, classNames: "ui-bezier-value" });
          var viewSelector = doc.createElement("div");
          var progressButton = createButton({ document: doc, text: options.progressLabel || "Progress / Value", disabled, classNames: "ui-bezier-view-button" });
          var speedButton = createButton({ document: doc, text: options.speedLabel || "Speed", disabled, classNames: "ui-bezier-view-button" });
          var speedHint = doc.createElement("p");
          var viewport = doc.createElement("div");
          var serialized = doc.createElement("output");
          var svg = doc.createElementNS ? doc.createElementNS("http://www.w3.org/2000/svg", "svg") : doc.createElement("svg");
          var gridPath = svgElement("path", "ui-bezier-grid");
          var tangentPath = svgElement("path", "ui-bezier-tangents");
          var curvePath2 = svgElement("path", "ui-bezier-curve");
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
            var node2 = doc.createElementNS ? doc.createElementNS("http://www.w3.org/2000/svg", tag) : doc.createElement(tag);
            node2.setAttribute("class", className);
            return node2;
          }
          function cloneValue(source) {
            return { x1: source.x1, y1: source.y1, x2: source.x2, y2: source.y2 };
          }
          function emit(kind, meta) {
            var callback = kind === "input" ? options.onInput : options.onChange;
            if (typeof callback === "function") callback(cloneValue(value2), meta || {});
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
              if (speed !== null) {
                min = Math.min(min, Math.max(-20, speed));
                max = Math.max(max, Math.min(20, speed));
              }
            }
            if (max - min < 1) max = min + 1;
            return { min: min - (max - min) * 0.12, max: max + (max - min) * 0.12 };
          }
          function mapX(x) {
            return PAD_X + x * (WIDTH - PAD_X * 2);
          }
          function mapSpeedInfluenceX(index, influence) {
            return mapX(index === 1 ? influence * SPEED_INFLUENCE_VISUAL_SPAN : 1 - influence * SPEED_INFLUENCE_VISUAL_SPAN);
          }
          function mapY(y, range) {
            return HEIGHT - PAD_Y - (y - range.min) / (range.max - range.min) * (HEIGHT - PAD_Y * 2);
          }
          function clientToSvgX(clientX, rect) {
            return (clientX - rect.left) / Math.max(1, rect.width) * WIDTH;
          }
          function unmapX(clientX, rect) {
            return Math.max(0, Math.min(1, (clientToSvgX(clientX, rect) - PAD_X) / (WIDTH - PAD_X * 2)));
          }
          function unmapSpeedInfluence(clientX, rect, index) {
            var graphX = (clientToSvgX(clientX, rect) - PAD_X) / (WIDTH - PAD_X * 2);
            return (index === 1 ? graphX : 1 - graphX) / SPEED_INFLUENCE_VISUAL_SPAN;
          }
          function unmapY(clientY, rect, range) {
            var svgY = (clientY - rect.top) / Math.max(1, rect.height) * HEIGHT;
            return range.max - (svgY - PAD_Y) / (HEIGHT - PAD_Y * 2) * (range.max - range.min);
          }
          function pathFromSamples(source, range, speedMode) {
            var path2 = "";
            var i;
            var point;
            var speed;
            for (i = 0; i <= 64; i++) {
              point = sampleBezier(source, i / 64);
              speed = speedMode ? sampleBezierSpeed(source, i / 64) : point.y;
              if (speed === null) continue;
              speed = Math.max(range.min, Math.min(range.max, speed));
              path2 += (path2 ? " L " : "M ") + roundBezierNumber(mapX(point.x)) + " " + roundBezierNumber(mapY(speed, range));
            }
            return path2;
          }
          function setCircle(circle, x, y) {
            circle.setAttribute("cx", roundBezierNumber(x));
            circle.setAttribute("cy", roundBezierNumber(y));
            circle.setAttribute("r", 7);
          }
          function render() {
            var range = activeDrag && activeDrag.range ? activeDrag.range : view2 === "speed" ? speedViewRange(value2) : progressViewRange(value2);
            var projection = bezierSpeedProjection(value2);
            var h1y = view2 === "speed" ? projection.startSpeed === null ? range.max : projection.startSpeed : value2.y1;
            var h2y = view2 === "speed" ? projection.endSpeed === null ? range.max : projection.endSpeed : value2.y2;
            valueInput.value = serializeCubicBezier(value2);
            serialized.textContent = valueInput.value;
            curvePath2.setAttribute("d", pathFromSamples(value2, range, view2 === "speed"));
            gridPath.setAttribute("d", "M " + PAD_X + " " + mapY(0, range) + " H " + (WIDTH - PAD_X) + " M " + PAD_X + " " + mapY(1, range) + " H " + (WIDTH - PAD_X));
            setCircle(startPoint, mapX(0), mapY(view2 === "speed" ? Math.max(range.min, Math.min(range.max, h1y)) : 0, range));
            setCircle(endPoint, mapX(1), mapY(view2 === "speed" ? Math.max(range.min, Math.min(range.max, h2y)) : 1, range));
            setCircle(handle1, view2 === "speed" ? mapSpeedInfluenceX(1, projection.startInfluence) : mapX(value2.x1), mapY(Math.max(range.min, Math.min(range.max, h1y)), range));
            setCircle(handle2, view2 === "speed" ? mapSpeedInfluenceX(2, projection.endInfluence) : mapX(value2.x2), mapY(Math.max(range.min, Math.min(range.max, h2y)), range));
            tangentPath.setAttribute("d", view2 === "progress" ? "M " + mapX(0) + " " + mapY(0, range) + " L " + mapX(value2.x1) + " " + mapY(value2.y1, range) + " M " + mapX(1) + " " + mapY(1, range) + " L " + mapX(value2.x2) + " " + mapY(value2.y2, range) : "M " + mapX(0) + " " + mapY(Math.max(range.min, Math.min(range.max, h1y)), range) + " L " + mapSpeedInfluenceX(1, projection.startInfluence) + " " + mapY(Math.max(range.min, Math.min(range.max, h1y)), range) + " M " + mapX(1) + " " + mapY(Math.max(range.min, Math.min(range.max, h2y)), range) + " L " + mapSpeedInfluenceX(2, projection.endInfluence) + " " + mapY(Math.max(range.min, Math.min(range.max, h2y)), range));
            handle1.setAttribute("aria-disabled", disabled || readonly || projection.startSpeed === null && view2 === "speed" ? "true" : "false");
            handle2.setAttribute("aria-disabled", disabled || readonly || projection.endSpeed === null && view2 === "speed" ? "true" : "false");
            handle1.setAttribute("aria-valuetext", view2 === "speed" ? "Influence " + value2.x1 + ", Speed " + (projection.startSpeed === null ? "undefined" : roundBezierNumber(projection.startSpeed)) : "X " + value2.x1 + ", Y " + value2.y1);
            handle2.setAttribute("aria-valuetext", view2 === "speed" ? "Influence " + roundBezierNumber(1 - value2.x2) + ", Speed " + (projection.endSpeed === null ? "undefined" : roundBezierNumber(projection.endSpeed)) : "X " + value2.x2 + ", Y " + value2.y2);
            progressButton.classList.toggle("is-active", view2 === "progress");
            speedButton.classList.toggle("is-active", view2 === "speed");
            rootElement.setAttribute("data-view", view2);
            speedHint.hidden = view2 !== "speed" || !speedHint.textContent;
            if (numeric.x1) {
              numeric.x1.value = String(value2.x1);
              numeric.y1.value = String(value2.y1);
              numeric.x2.value = String(value2.x2);
              numeric.y2.value = String(value2.y2);
            }
          }
          function applyValue(nextValue, kind, meta) {
            if (!isValidBezierValue(nextValue)) return false;
            value2 = normalizeBezierValue(nextValue, value2);
            render();
            if (kind) emit(kind, meta);
            return true;
          }
          function setCoordinate(key, nextValue, kind, meta) {
            var next = cloneValue(value2);
            var numericValue = Number(nextValue);
            if (!isFinite(numericValue)) return false;
            if (key === "x1" || key === "x2") numericValue = Math.max(0, Math.min(1, numericValue));
            next[key] = numericValue;
            return applyValue(next, kind, meta);
          }
          function buildNumeric(key, labelText, min, max) {
            var field2 = doc.createElement("label");
            var label2 = doc.createElement("span");
            var input;
            label2.textContent = labelText;
            field2.className = "ui-bezier-numeric-field";
            input = createNumberInput({ document: doc, id: (options.id || "bezier") + "-" + key, value: value2[key], min, max, step: 0.01, field: { min, max, step: 0.01, defaultValue: value2[key] }, disabled: disabled || readonly, ariaLabel: labelText, onInput: function() {
              if (!isNumberDraft(input.value)) setCoordinate(key, input.value, "input", { source: "numeric", coordinate: key });
            }, onDragValue: function(next) {
              setCoordinate(key, next, "input", { source: "numeric-scrub", coordinate: key });
            }, onCommit: function() {
              if (!setCoordinate(key, input.value, "change", { source: "numeric", coordinate: key })) render();
            }, onCancel: function(restored) {
              setCoordinate(key, restored, null);
              render();
              if (typeof options.onCancel === "function") options.onCancel(cloneValue(value2), { source: "numeric", coordinate: key });
            }, onDragEnd: function() {
              emit("change", { source: "numeric-scrub", coordinate: key });
            } });
            field2.appendChild(label2);
            field2.appendChild(input);
            numericGrid.appendChild(field2);
            numeric[key] = input;
          }
          function switchView(nextView) {
            if (nextView !== "progress" && nextView !== "speed") return;
            view2 = nextView;
            progressButton.setAttribute("aria-pressed", view2 === "progress" ? "true" : "false");
            speedButton.setAttribute("aria-pressed", view2 === "speed" ? "true" : "false");
            render();
          }
          function setDisabled(nextDisabled) {
            disabled = nextDisabled === true;
            valueInput.disabled = disabled;
            progressButton.disabled = disabled;
            speedButton.disabled = disabled;
            numeric.x1.disabled = disabled || readonly;
            numeric.y1.disabled = disabled || readonly;
            numeric.x2.disabled = disabled || readonly;
            numeric.y2.disabled = disabled || readonly;
            handle1.setAttribute("tabindex", disabled || readonly ? "-1" : "0");
            handle2.setAttribute("tabindex", disabled || readonly ? "-1" : "0");
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
            range = view2 === "speed" ? speedViewRange(value2) : progressViewRange(value2);
            projection = bezierSpeedProjection(value2);
            if (view2 === "speed" && (index === 1 ? projection.startSpeed === null : projection.endSpeed === null)) return;
            editSnapshot = cloneValue(value2);
            activeDrag = { index, range, pointerId: event.pointerId, shiftConstrained: view2 === "speed" && event.shiftKey === true, transitionReference: null };
            if (view2 === "speed") {
              rect = svg.getBoundingClientRect();
              pointerX = unmapSpeedInfluence(event.clientX, rect, index);
              pointerY = unmapY(event.clientY, rect, range);
              influence = index === 1 ? projection.startInfluence : projection.endInfluence;
              speed = index === 1 ? projection.startSpeed : projection.endSpeed;
              activeDrag.transitionReference = { pointerX, pointerY, influence, speed };
            }
            if (event.currentTarget && event.currentTarget.setPointerCapture && event.pointerId !== void 0) try {
              event.currentTarget.setPointerCapture(event.pointerId);
            } catch (ignored) {
            }
            if (event.preventDefault) event.preventDefault();
            doc.addEventListener("pointermove", dragMove);
            doc.addEventListener("pointerup", dragEnd);
            doc.addEventListener("pointercancel", dragCancel);
            doc.addEventListener("keydown", dragKeydown, true);
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
            if (doc.documentElement && doc.documentElement.contains && !doc.documentElement.contains(rootElement)) {
              dragCancel();
              return;
            }
            rect = svg.getBoundingClientRect();
            x = view2 === "speed" ? unmapSpeedInfluence(event.clientX, rect, activeDrag.index) : unmapX(event.clientX, rect);
            y = unmapY(event.clientY, rect, activeDrag.range);
            shiftConstrained = view2 === "speed" && event.shiftKey === true;
            if (view2 === "speed" && shiftConstrained !== activeDrag.shiftConstrained) {
              projection = bezierSpeedProjection(value2);
              influence = activeDrag.index === 1 ? projection.startInfluence : projection.endInfluence;
              speed = activeDrag.index === 1 ? projection.startSpeed : projection.endSpeed;
              activeDrag.shiftConstrained = shiftConstrained;
              activeDrag.transitionReference = { pointerX: x, pointerY: y, influence, speed };
              if (event.preventDefault) event.preventDefault();
              return;
            }
            next = cloneValue(value2);
            if (view2 === "progress") {
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
              if (activeDrag.index === 1) {
                next.x1 = influence;
                next.y1 = speed * influence;
              } else {
                next.x2 = 1 - influence;
                next.y2 = 1 - speed * influence;
              }
            }
            applyValue(next, "input", { source: view2 + "-graph", point: activeDrag.index });
            if (event.preventDefault) event.preventDefault();
          }
          function dragKeydown(event) {
            if (activeDrag && event.keyCode === 27) {
              if (event.preventDefault) event.preventDefault();
              dragCancel();
            }
          }
          function clearDrag() {
            doc.removeEventListener("pointermove", dragMove);
            doc.removeEventListener("pointerup", dragEnd);
            doc.removeEventListener("pointercancel", dragCancel);
            doc.removeEventListener("keydown", dragKeydown, true);
            activeDrag = null;
          }
          function dragEnd() {
            if (!activeDrag) return;
            clearDrag();
            render();
            emit("change", { source: view2 + "-graph" });
          }
          function dragCancel() {
            if (!activeDrag) return;
            clearDrag();
            applyValue(editSnapshot, null);
            if (typeof options.onCancel === "function") options.onCancel(cloneValue(value2), { source: "pointercancel" });
          }
          function handleKey(event, index) {
            var dx = 0;
            var dy = 0;
            var amount = event.shiftKey ? 0.05 : 0.01;
            var next;
            if (disabled || readonly) return;
            if (event.keyCode === 37) dx = -amount;
            else if (event.keyCode === 39) dx = amount;
            else if (event.keyCode === 38) dy = amount;
            else if (event.keyCode === 40) dy = -amount;
            else return;
            event.preventDefault();
            next = cloneValue(value2);
            if (view2 === "progress") {
              next[index === 1 ? "x1" : "x2"] = Math.max(0, Math.min(1, next[index === 1 ? "x1" : "x2"] + dx));
              next[index === 1 ? "y1" : "y2"] += dy;
            } else {
              var projection = bezierSpeedProjection(value2);
              var influence = index === 1 ? projection.startInfluence : projection.endInfluence;
              var speed = index === 1 ? projection.startSpeed : projection.endSpeed;
              if (speed === null) return;
              influence = Math.max(0, Math.min(1, influence + (index === 1 ? dx : -dx)));
              speed += dy;
              if (index === 1) {
                next.x1 = influence;
                next.y1 = speed * influence;
              } else {
                next.x2 = 1 - influence;
                next.y2 = 1 - speed * influence;
              }
            }
            applyValue(next, "input", { source: "keyboard", point: index });
            emit("change", { source: "keyboard", point: index });
          }
          valueInput.type = "hidden";
          rootElement.setAttribute("aria-disabled", disabled ? "true" : "false");
          rootElement.setAttribute("data-readonly", readonly ? "true" : "false");
          valueInput._coreBezierFieldGetValue = function() {
            return cloneValue(value2);
          };
          valueInput._coreBezierFieldSetValue = function(next) {
            applyValue(next, null);
          };
          viewSelector.className = "ui-bezier-view-selector";
          viewSelector.setAttribute("role", "group");
          progressButton.setAttribute("aria-pressed", view2 === "progress" ? "true" : "false");
          speedButton.setAttribute("aria-pressed", view2 === "speed" ? "true" : "false");
          progressButton.addEventListener("click", function() {
            switchView("progress");
          });
          speedButton.addEventListener("click", function() {
            switchView("speed");
          });
          viewport.className = "ui-bezier-viewport";
          serialized.className = "ui-bezier-serialized";
          serialized.setAttribute("aria-live", "polite");
          speedHint.className = "ui-bezier-speed-hint";
          speedHint.textContent = options.speedHint || "";
          svg.setAttribute("viewBox", "0 0 " + WIDTH + " " + HEIGHT);
          svg.setAttribute("role", "img");
          svg.setAttribute("aria-label", options.graphLabel || "Cubic Bezier curve editor");
          handle1.setAttribute("tabindex", disabled || readonly ? "-1" : "0");
          handle2.setAttribute("tabindex", disabled || readonly ? "-1" : "0");
          handle1.setAttribute("role", "slider");
          handle2.setAttribute("role", "slider");
          handle1.setAttribute("aria-label", options.point1Label || "Control Point 1");
          handle2.setAttribute("aria-label", options.point2Label || "Control Point 2");
          handle1.addEventListener("pointerdown", function(event) {
            beginDrag(event, 1);
          });
          handle2.addEventListener("pointerdown", function(event) {
            beginDrag(event, 2);
          });
          handle1.addEventListener("keydown", function(event) {
            handleKey(event, 1);
          });
          handle2.addEventListener("keydown", function(event) {
            handleKey(event, 2);
          });
          svg.appendChild(gridPath);
          svg.appendChild(tangentPath);
          svg.appendChild(curvePath2);
          svg.appendChild(startPoint);
          svg.appendChild(endPoint);
          svg.appendChild(handle1);
          svg.appendChild(handle2);
          viewport.appendChild(svg);
          numericGrid.className = "ui-bezier-numeric-grid";
          buildNumeric("x1", options.x1Label || "P1 X", 0, 1);
          buildNumeric("y1", options.y1Label || "P1 Y");
          buildNumeric("x2", options.x2Label || "P2 X", 0, 1);
          buildNumeric("y2", options.y2Label || "P2 Y");
          rootElement.appendChild(valueInput);
          rootElement.appendChild(viewSelector);
          viewSelector.appendChild(progressButton);
          viewSelector.appendChild(speedButton);
          rootElement.appendChild(speedHint);
          rootElement.appendChild(viewport);
          rootElement.appendChild(serialized);
          rootElement.appendChild(numericGrid);
          valueInput._coreSetDisabled = setDisabled;
          rootElement._coreSetDisabled = setDisabled;
          resizeHandler = function() {
            if (!disposed) render();
          };
          if (win && typeof win.ResizeObserver === "function") {
            resizeObserver = new win.ResizeObserver(resizeHandler);
            resizeObserver.observe(viewport);
          } else if (win && win.addEventListener) win.addEventListener("resize", resizeHandler);
          render();
          return { root: rootElement, input: valueInput, serialized, speedHint, svg, handles: [handle1, handle2], numeric, viewButtons: { progress: progressButton, speed: speedButton }, getValue: function() {
            return cloneValue(value2);
          }, setValue: function(next) {
            return applyValue(next, null);
          }, setDisabled, setView: switchView, getView: function() {
            return view2;
          }, cancel: dragCancel, dispose: function() {
            disposed = true;
            clearDrag();
            if (resizeObserver) resizeObserver.disconnect();
            else if (win && win.removeEventListener) win.removeEventListener("resize", resizeHandler);
          } };
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
          function toggle() {
            setExpanded(!expanded, true);
          }
          trigger.addEventListener("click", toggle);
          setExpanded(expanded, false);
          return { trigger, content, isExpanded: function() {
            return expanded;
          }, setExpanded: function(nextExpanded) {
            return setExpanded(nextExpanded, false);
          }, dispose: function() {
            trigger.removeEventListener("click", toggle);
          } };
        }
        function createButton(options) {
          var button2 = applyCommon(options.document.createElement("button"), options);
          button2.type = options.type || "button";
          addClasses(button2, "ui-button");
          if (options.variant) addClasses(button2, "ui-button--" + options.variant);
          if (options.size) addClasses(button2, "ui-button--" + options.size);
          if (options.text !== void 0) button2.textContent = options.text;
          listen(button2, "click", options.onClick);
          return button2;
        }
        function createColorField(options) {
          var doc = options.document;
          var rootElement = applyCommon(doc.createElement("span"), { classNames: "ui-color-field " + (options.classNames || "") });
          var supportsAlpha = options.supportsAlpha === true;
          var normalize = options.normalize || function(value3, fallback2) {
            return value3 || fallback2;
          };
          var fallback = options.fallback || "#ffffff";
          var value2 = supportsAlpha ? normalizeColorAlphaValue(options.value, { color: fallback, alpha: 1 }) : normalize(options.value, fallback);
          var swatch = createButton({ document: doc, disabled: options.disabled, classNames: "ui-color-swatch " + (options.swatchClassNames || ""), ariaLabel: options.ariaLabel });
          var valueInput = applyCommon(doc.createElement("input"), { id: options.id, disabled: options.disabled, classNames: options.valueClassNames });
          var hex2 = createTextInput({ document: doc, id: options.hexId || options.id + "Hex", disabled: options.disabled, value: supportsAlpha ? value2.color : value2, classNames: "ui-color-hex " + (options.hexClassNames || ""), spellcheck: false });
          var alpha = null;
          function cloneColorAlpha(next) {
            return { color: next.color, alpha: next.alpha };
          }
          function setValue(nextValue) {
            var normalized;
            if (supportsAlpha) {
              normalized = normalizeColorAlphaValue(nextValue, value2);
              if (!normalized) return cloneColorAlpha(value2);
              value2 = normalized;
              valueInput.value = JSON.stringify(value2);
              hex2.value = value2.color;
              swatch.style.backgroundColor = serializeColorAlphaValue(value2);
              if (alpha) alpha.setValue(value2.alpha);
              return cloneColorAlpha(value2);
            }
            normalized = normalize(nextValue, valueInput.value || fallback);
            valueInput.value = normalized;
            hex2.value = normalized;
            swatch.style.backgroundColor = normalized;
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
          hex2._registryOnValueChange = function() {
            preview(supportsAlpha ? { color: hex2.value, alpha: value2.alpha } : hex2.value);
          };
          listen(hex2, "input", function() {
            if (supportsAlpha ? /^#[0-9a-fA-F]{6}$/.test(hex2.value) : !options.isValid || options.isValid(hex2.value)) preview(supportsAlpha ? { color: hex2.value, alpha: value2.alpha } : hex2.value);
          });
          listen(hex2, "change", function() {
            commit(supportsAlpha ? { color: hex2.value, alpha: value2.alpha } : hex2.value);
          });
          listen(swatch, "click", function(event) {
            if (event) {
              event.preventDefault();
              event.stopPropagation();
            }
            if (options.openPicker) options.openPicker({ input: valueInput, hexInput: hex2, swatch, value: supportsAlpha ? value2.color : valueInput.value, fallback, onPreview: supportsAlpha ? function(next) {
              preview({ color: next, alpha: value2.alpha });
            } : preview, onCommit: supportsAlpha ? function(next) {
              commit({ color: next, alpha: value2.alpha });
            } : commit, onCancel: options.onCancel });
            else if (options.onSwatchClick) options.onSwatchClick(event);
          });
          rootElement.appendChild(swatch);
          rootElement.appendChild(valueInput);
          rootElement.appendChild(hex2);
          if (supportsAlpha) {
            rootElement.className += " ui-color-field--alpha";
            alpha = createRangeNumber({ document: doc, numberId: options.id + "AlphaNumber", rangeId: options.id + "AlphaRange", value: value2.alpha, min: 0, max: 1, step: 0.01, displayStep: 1, valueToDisplay: function(next) {
              return Math.round(next * 100);
            }, displayToValue: function(next) {
              return next / 100;
            }, unitText: "%", disabled: options.disabled, classNames: "ui-color-alpha", onPreview: function(next) {
              preview({ color: value2.color, alpha: next });
            }, onCommit: function(next) {
              commit({ color: value2.color, alpha: next });
            } });
            rootElement.appendChild(alpha.root);
          }
          setValue(value2);
          return { root: rootElement, swatch, input: valueInput, hex: hex2, alpha, setValue, getValue: function() {
            return supportsAlpha ? cloneColorAlpha(value2) : valueInput.value;
          } };
        }
        function parseColorAlphaValue(input) {
          var match = /^\s*rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*((?:\d+\.?\d*|\.\d+))\s*\)\s*$/i.exec(String(input || ""));
          var channels;
          var color;
          var value2;
          if (!match) return null;
          channels = [Number(match[1]), Number(match[2]), Number(match[3])];
          value2 = { color: "", alpha: Number(match[4]) };
          if (channels.some(function(channel) {
            return !isFinite(channel) || channel < 0 || channel > 255;
          }) || !isFinite(value2.alpha) || value2.alpha < 0 || value2.alpha > 1) return null;
          color = channels.map(function(channel) {
            var hex2 = channel.toString(16);
            return hex2.length < 2 ? "0" + hex2 : hex2;
          }).join("");
          value2.color = "#" + color;
          return value2;
        }
        function isValidColorAlphaValue(value2) {
          return !!value2 && typeof value2.color === "string" && /^#[0-9a-fA-F]{6}$/.test(value2.color) && typeof value2.alpha === "number" && isFinite(value2.alpha) && value2.alpha >= 0 && value2.alpha <= 1;
        }
        function normalizeColorAlphaValue(value2, fallback) {
          var candidate = isValidColorAlphaValue(value2) ? value2 : fallback;
          return isValidColorAlphaValue(candidate) ? { color: candidate.color.toLowerCase(), alpha: Number(candidate.alpha) } : null;
        }
        function serializeColorAlphaValue(value2) {
          var normalized = normalizeColorAlphaValue(value2, null);
          var channels;
          if (!normalized) return "";
          channels = [normalized.color.slice(1, 3), normalized.color.slice(3, 5), normalized.color.slice(5, 7)].map(function(part) {
            return parseInt(part, 16);
          });
          return "rgba(" + channels.join(", ") + ", " + normalized.alpha + ")";
        }
        function parseShadowValue(value2) {
          var match = /^\s*(0|-?(?:\d+\.?\d*|\.\d+)px)\s+(0|-?(?:\d+\.?\d*|\.\d+)px)\s+(0|(?:\d+\.?\d*|\.\d+)px)(?:\s+(0|-?(?:\d+\.?\d*|\.\d+)px))?\s+rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*((?:\d+\.?\d*|\.\d+))\s*\)\s*$/i.exec(String(value2 || ""));
          var result;
          if (!match) return null;
          result = { offsetX: parseFloat(match[1]), offsetY: parseFloat(match[2]), blur: parseFloat(match[3]), spread: match[4] === void 0 ? 0 : parseFloat(match[4]), color: "#" + [match[5], match[6], match[7]].map(function(part) {
            var hex2 = Number(part).toString(16);
            return hex2.length < 2 ? "0" + hex2 : hex2;
          }).join(""), alpha: Number(match[8]) };
          return isValidShadowValue(result) ? result : null;
        }
        function isValidShadowValue(value2) {
          return !!value2 && ["offsetX", "offsetY", "blur", "spread", "alpha"].every(function(key) {
            return typeof value2[key] === "number" && isFinite(value2[key]);
          }) && value2.blur >= 0 && value2.alpha >= 0 && value2.alpha <= 1 && /^#[0-9a-f]{6}$/i.test(value2.color || "");
        }
        function serializeShadowValue(value2) {
          var rgb;
          if (!isValidShadowValue(value2)) return "";
          rgb = [value2.color.slice(1, 3), value2.color.slice(3, 5), value2.color.slice(5, 7)].map(function(part) {
            return parseInt(part, 16);
          });
          return value2.offsetX + "px " + value2.offsetY + "px " + value2.blur + "px" + (value2.spread ? " " + value2.spread + "px" : "") + " rgba(" + rgb.join(", ") + ", " + value2.alpha + ")";
        }
        function createShadowField(options) {
          var doc = options.document;
          var sourceValue = options.value;
          var value2 = isValidShadowValue(sourceValue) ? { offsetX: sourceValue.offsetX, offsetY: sourceValue.offsetY, blur: sourceValue.blur, spread: sourceValue.spread, color: sourceValue.color, alpha: sourceValue.alpha } : { offsetX: 0, offsetY: 0, blur: 0, spread: 0, color: "#000000", alpha: 0 };
          var labels = options.labels || {};
          var rootElement = applyCommon(doc.createElement("div"), { classNames: "ui-shadow-field " + (options.classNames || "") });
          var inputs = {};
          var color;
          function clone3() {
            return { offsetX: value2.offsetX, offsetY: value2.offsetY, blur: value2.blur, spread: value2.spread, color: value2.color, alpha: value2.alpha };
          }
          function setValue(next) {
            var key;
            if (!isValidShadowValue(next)) return clone3();
            value2 = { offsetX: next.offsetX, offsetY: next.offsetY, blur: next.blur, spread: next.spread, color: next.color, alpha: next.alpha };
            for (key in inputs) if (Object.prototype.hasOwnProperty.call(inputs, key)) inputs[key].value = String(value2[key]);
            color.setValue(value2.color);
            return clone3();
          }
          function emit(kind) {
            if (typeof options[kind] === "function") options[kind](clone3());
          }
          function createSubfield(key, control, labelTag) {
            var wrapper = applyCommon(doc.createElement("div"), { classNames: "ui-shadow-subfield ui-shadow-subfield--" + key });
            var label2 = applyCommon(doc.createElement(labelTag || "label"), { classNames: "ui-shadow-subfield-label" });
            label2.textContent = labels[key] || key;
            if (labelTag !== "span") label2.setAttribute("for", control.id);
            else {
              wrapper.setAttribute("role", "group");
              wrapper.setAttribute("aria-label", label2.textContent);
            }
            wrapper.appendChild(label2);
            wrapper.appendChild(control);
            rootElement.appendChild(wrapper);
            return wrapper;
          }
          function addNumber(key, min, max, step) {
            var input;
            var field2 = { min, max, step, defaultValue: value2[key] };
            function preview(next) {
              value2[key] = normalizeNumber(next, field2, value2[key]);
              emit("onPreview");
            }
            function commit(next) {
              value2[key] = normalizeNumber(next, field2, value2[key]);
              emit("onCommit");
            }
            input = createNumberInput({ document: doc, id: options.id + "-" + key, value: value2[key], field: field2, ariaLabel: labels[key] || key, onInput: function() {
              if (!isNumberDraft(input.value)) preview(input.value);
            }, onDragValue: preview, onCommit: commit, onCancel: function(restored) {
              value2[key] = normalizeNumber(restored, field2, value2[key]);
              if (typeof options.onCancel === "function") options.onCancel(clone3());
            }, onDragEnd: function() {
              commit(input.value);
            } });
            inputs[key] = input;
            createSubfield(key, input);
          }
          addNumber("offsetX", void 0, void 0, 1);
          addNumber("offsetY", void 0, void 0, 1);
          addNumber("blur", 0, void 0, 1);
          addNumber("spread", void 0, void 0, 1);
          color = createColorField({ document: doc, id: options.id + "-color", value: value2.color, fallback: "#000000", ariaLabel: labels.color || "color", normalize: function(next, fallback) {
            return /^#[0-9a-f]{6}$/i.test(next || "") ? next : fallback;
          }, isValid: function(next) {
            return /^#[0-9a-f]{6}$/i.test(next || "");
          }, openPicker: options.openPicker, onPreview: function(next) {
            value2.color = next;
            emit("onPreview");
          }, onCommit: function(next) {
            value2.color = next;
            emit("onCommit");
          }, onCancel: function() {
            if (typeof options.onCancel === "function") options.onCancel(clone3());
          } });
          createSubfield("color", color.root, "span");
          addNumber("alpha", 0, 1, 0.01);
          return { root: rootElement, inputs, color, getValue: clone3, setValue };
        }
        function createFieldRow(options) {
          var doc = options.document;
          var row = applyCommon(doc.createElement(options.labelRow ? "label" : "div"), { classNames: "ui-field-row " + (options.classNames || "") });
          var copy3 = applyCommon(doc.createElement(options.copyTag || "span"), { classNames: "ui-field-copy " + (options.copyClassNames || "") });
          var label2 = applyCommon(doc.createElement(options.labelTag || "strong"), { classNames: "ui-field-label " + (options.labelClassNames || "") });
          var hint;
          if (options.contentGrowth === true) row.className += " is-content-growth";
          label2.textContent = options.labelText || "";
          if (options.labelKey) label2.setAttribute("data-i18n", options.labelKey);
          if (options.labelFor) copy3.setAttribute("for", options.labelFor);
          copy3.appendChild(label2);
          if (options.descriptionText || options.descriptionKey) {
            hint = applyCommon(doc.createElement("small"), { classNames: "ui-field-description " + (options.descriptionClassNames || "") });
            hint.textContent = options.descriptionText || "";
            if (options.descriptionKey) hint.setAttribute("data-i18n", options.descriptionKey);
            copy3.appendChild(hint);
          }
          row.appendChild(copy3);
          if (options.control) row.appendChild(options.control);
          return { row, copy: copy3, label: label2, description: hint || null };
        }
        return {
          addClasses,
          createTextInput,
          createTextarea,
          createNumberInput,
          createRangeNumber,
          createSelect,
          enhanceSelect,
          closeSelectComponents,
          createSwitch,
          createCheckbox,
          createChoiceGroup,
          createBezierCurveField,
          createDisclosureController,
          createButton,
          renderAssetPersistenceNotice,
          createColorField,
          parseColorAlphaValue,
          isValidColorAlphaValue,
          normalizeColorAlphaValue,
          serializeColorAlphaValue,
          parseShadowValue,
          isValidShadowValue,
          serializeShadowValue,
          createShadowField,
          createFieldRow,
          normalizeNumber,
          isNumberDraft,
          setNumberValue,
          bindNumberDrag,
          isValidBezierValue,
          normalizeBezierValue,
          parseCubicBezier,
          serializeCubicBezier,
          sampleBezier,
          sampleBezierSpeed,
          bezierSpeedProjection
        };
      });
    }
  });

  // client/js/statusTone.js
  var require_statusTone = __commonJS({
    "client/js/statusTone.js"(exports, module) {
      (function(root2, factory) {
        "use strict";
        var exported = Object.freeze(factory());
        if (typeof module === "object" && module.exports) {
          module.exports.StatusToneContract = exported;
        }
        if (root2 && !Object.prototype.hasOwnProperty.call(root2, "StatusToneContract")) {
          Object.defineProperty(root2, "StatusToneContract", { configurable: false, enumerable: true, value: exported, writable: false });
        }
      })(typeof self !== "undefined" ? self : exports, function() {
        "use strict";
        var TONES = Object.freeze(["idle", "processing", "success", "warning", "error", "disabled"]);
        var STATE_TONES = Object.freeze({
          "requesting": "processing",
          "reviewing": "processing",
          "checking": "processing",
          "experimental-checking": "processing",
          "awaiting-confirmation": "processing",
          "executing": "processing",
          "pending": "processing",
          "generating": "processing",
          "busy": "processing",
          "successful": "success",
          "ready": "success",
          "experimental-ready": "success",
          "completed": "success",
          "available": "success",
          "connected": "success",
          "ok": "success",
          "selection-required": "warning",
          "no-selection": "warning",
          "no-active-comp": "warning",
          "capability-limited": "warning",
          "qualification-required": "warning",
          "experimental-disabled": "warning",
          "experimental-unavailable": "warning",
          "experimental-configuring": "warning",
          "endpoint-invalid": "warning",
          "configured-model-not-found": "warning",
          "configured-model-not-loaded": "warning",
          "error": "error",
          "failed": "error",
          "execution-failed": "error",
          "request-failed": "error",
          "readiness-network-failed": "error",
          "readiness-http-failed": "error",
          "readiness-response-invalid": "error",
          "disabled": "disabled",
          "user-disabled": "disabled"
        });
        function toneForState(state) {
          return typeof state === "string" && Object.prototype.hasOwnProperty.call(STATE_TONES, state) ? STATE_TONES[state] : "idle";
        }
        function toneForLegacyType(type, state) {
          var stateTone = toneForState(state);
          if (stateTone !== "idle" || state === "idle") {
            return stateTone;
          }
          return type === "busy" ? "processing" : type === "ok" ? "success" : type === "error" ? "error" : type === "disabled" ? "disabled" : "idle";
        }
        return Object.freeze({ tones: TONES, toneForState, toneForLegacyType });
      });
    }
  });

  // client/js/vela/velaPresentationModel.js
  var require_velaPresentationModel = __commonJS({
    "client/js/vela/velaPresentationModel.js"(exports) {
      (function(root2, factory) {
        "use strict";
        var exported = Object.freeze(factory());
        if (root2 && !Object.prototype.hasOwnProperty.call(root2, "VelaPresentationModel")) {
          Object.defineProperty(root2, "VelaPresentationModel", { configurable: false, enumerable: true, value: exported, writable: false });
        }
      })(typeof self !== "undefined" ? self : exports, function() {
        "use strict";
        var ERROR_DISPLAY_KEYS = Object.freeze({
          "VERIFICATION_UNAVAILABLE": "vela.surfaceContextUnavailable",
          "PROVIDER_CONNECTION_FAILED": "vela.surfaceProviderConnection",
          "PROVIDER_TIMEOUT": "vela.surfaceProviderTimeout",
          "PROVIDER_REQUEST_ABORTED": "vela.surfaceProviderCancelled",
          "PROVIDER_HTTP_ERROR": "vela.surfaceProviderResponse",
          "PROVIDER_RESPONSE_INVALID": "vela.surfaceProviderResponse",
          "PROVIDER_RESPONSE_TOO_LARGE": "vela.surfaceProviderResponse",
          "PROVIDER_CONFIG_INVALID": "vela.surfaceProviderConfiguration",
          "RUNTIME_CAPABILITY_UNAVAILABLE": "vela.surfaceRuntimeUnavailable",
          "LIFECYCLE_BLOCKED": "vela.surfaceRuntimeUnavailable",
          "REVIEW_REQUIRED": "vela.surfaceReviewRequired",
          "PERMISSION_DENIED": "vela.surfacePermissionDenied",
          "SCHEMA_VALIDATION_FAILED": "vela.surfaceGenericError",
          "PAYLOAD_BUDGET_EXCEEDED": "vela.surfaceGenericError",
          "UNKNOWN_TARGET": "vela.surfaceNoActionableTarget",
          "CONTEXT_STALE": "vela.surfaceGenericError",
          "CONTEXT_VALUE_EVALUATION_DISALLOWED": "vela.surfaceGenericError",
          "CONTEXT_VALUE_UNSUPPORTED": "vela.surfaceGenericError",
          "CONTEXT_VALUE_INVALID": "vela.surfaceGenericError"
        });
        function safeText(value2) {
          return typeof value2 === "string" ? value2 : "";
        }
        function safePositiveInteger(value2) {
          return Number.isSafeInteger(value2) && value2 >= 1;
        }
        function errorDisplayKey(code) {
          return typeof code === "string" && Object.prototype.hasOwnProperty.call(ERROR_DISPLAY_KEYS, code) ? ERROR_DISPLAY_KEYS[code] : "vela.surfaceGenericError";
        }
        function statusTone(state, disabledReason) {
          var Contract = typeof StatusToneContract !== "undefined" ? StatusToneContract : typeof __require === "function" ? require_statusTone().StatusToneContract : null;
          if (state === "experimental-disabled" && disabledReason === "user-disabled") {
            return "disabled";
          }
          return Contract && Contract.toneForState ? Contract.toneForState(state) : "idle";
        }
        function projectSurfaceState(providerState, confirmationState, composerValue, experimentalEnabled, experimentalState, activationPolicy, disabledReason) {
          var provider = providerState && typeof providerState.state === "string" ? providerState.state : "idle";
          var confirmation = confirmationState && typeof confirmationState.state === "string" ? confirmationState.state : "idle";
          var state = "idle";
          if (experimentalEnabled !== true) {
            state = experimentalState === "configuring" || experimentalState === "checking" || experimentalState === "unavailable" ? "experimental-" + experimentalState : experimentalState === "disabled" || experimentalState === "ready" ? "experimental-disabled" : experimentalState || "experimental-disabled";
          } else if (provider === "objective-blocked") {
            state = "blocked";
          } else if (provider === "failed" || provider === "intent-rejected") {
            state = "error";
          } else if (provider === "cancelled") {
            state = "cancelled";
          } else if (provider === "completed" || provider === "local-proposal-handled") {
            state = "completed";
          } else if (confirmation === "executing") {
            state = "executing";
          } else if (confirmation === "confirmation-ready") {
            state = "awaiting-confirmation";
          } else if (confirmation === "review-approved") {
            state = "awaiting-continuation";
          } else if (confirmation === "execution-failed") {
            state = "error";
          } else if (confirmation === "execution-completed") {
            state = "completed";
          } else if (confirmation === "rejected") {
            state = "cancelled";
          } else if (provider === "pending") {
            state = "requesting";
          } else if (provider === "proposal-ready" || provider === "proposal-reviewing") {
            state = "reviewing";
          } else if (typeof composerValue === "string" && /\S/.test(composerValue)) {
            state = "composing";
          }
          return Object.freeze({
            state,
            tone: statusTone(state, disabledReason),
            experimental: activationPolicy && activationPolicy.releaseMode === "experimental-preview",
            qualified: !!(activationPolicy && activationPolicy.qualifiedDefaultModelId),
            manualOptInRequired: !!(activationPolicy && activationPolicy.experimentalOptInAllowed && !activationPolicy.productionEnabled),
            productionEnabled: !!(activationPolicy && activationPolicy.productionEnabled),
            productionBlockReason: activationPolicy && activationPolicy.productionBlockReason || null
          });
        }
        function create() {
          var items = [];
          var pending = false;
          var terminalGeneration = 0;
          var confirmationState = "idle";
          var suppressConfirmationTerminal = false;
          var proposalReviewPending = false;
          var transientInvocations = [];
          var activeTransientInvocationId = null;
          var transientRuntimeGeneration = 0;
          var transientSerial = 0;
          var presentationTurnSerial = 0;
          var activePresentationTurnId = null;
          function snapshot() {
            return Object.freeze({
              pending,
              items: Object.freeze(items.slice()),
              terminalGeneration
            });
          }
          function transientSnapshot() {
            return Object.freeze({ activeInvocationId: activeTransientInvocationId, presentationTurnId: activePresentationTurnId, runtimeGeneration: transientRuntimeGeneration, invocations: Object.freeze(transientInvocations.map(function(entry) {
              return Object.freeze({ reasoningInvocationId: entry.reasoningInvocationId, presentationTurnId: entry.presentationTurnId, state: entry.state, reasoningText: entry.reasoningText, text: entry.text, runtimeGeneration: entry.runtimeGeneration, presentationMode: entry.presentationMode, reconciliation: entry.reconciliation, assistantReconciliation: entry.assistantReconciliation });
            })) });
          }
          function findTransient(id) {
            var index;
            for (index = 0; index < transientInvocations.length; index += 1) {
              if (transientInvocations[index].reasoningInvocationId === id) {
                return transientInvocations[index];
              }
            }
            return null;
          }
          function applyPresentationEvent(envelope) {
            var event;
            var invocation;
            var type;
            if (!envelope || envelope.type !== "provider-stream-event" || !safePositiveInteger(envelope.runtimeGeneration) || typeof envelope.reasoningInvocationId !== "string" || !envelope.reasoningInvocationId || envelope.presentationMode !== "assistant-text" && envelope.presentationMode !== "structured" || !envelope.providerEvent || !Object.isFrozen(envelope.providerEvent)) {
              return transientSnapshot();
            }
            if (envelope.runtimeGeneration < transientRuntimeGeneration) {
              return transientSnapshot();
            }
            event = envelope.providerEvent;
            if (typeof event.type !== "string" || typeof event.requestId !== "string" || !safePositiveInteger(event.generation) || typeof event.providerId !== "string" || typeof event.modelId !== "string") {
              return transientSnapshot();
            }
            transientRuntimeGeneration = envelope.runtimeGeneration;
            type = event.type;
            invocation = findTransient(envelope.reasoningInvocationId);
            if (type === "stream-started") {
              if (invocation) {
                return transientSnapshot();
              }
              invocation = { reasoningInvocationId: envelope.reasoningInvocationId, presentationTurnId: activePresentationTurnId, state: "streaming", reasoningText: "", text: "", runtimeGeneration: envelope.runtimeGeneration, presentationMode: envelope.presentationMode, reconciliation: null, assistantReconciliation: null, serial: ++transientSerial };
              transientInvocations.push(invocation);
              activeTransientInvocationId = invocation.reasoningInvocationId;
              return transientSnapshot();
            }
            if (!invocation || invocation.runtimeGeneration !== envelope.runtimeGeneration || invocation.reconciliation !== null || activeTransientInvocationId !== invocation.reasoningInvocationId) {
              return transientSnapshot();
            }
            if (type === "reasoning-delta" && typeof event.text === "string" && event.text.length > 0) {
              invocation.reasoningText += event.text;
            } else if (type === "text-delta" && invocation.presentationMode === "assistant-text" && typeof event.text === "string" && event.text.length > 0) {
              invocation.text += event.text;
            } else if (type === "stream-completed" || type === "stream-failed" || type === "stream-cancelled") {
              invocation.state = type;
              invocation.reconciliation = "presentation-terminal";
              if (activeTransientInvocationId === invocation.reasoningInvocationId) {
                activeTransientInvocationId = null;
              }
            }
            return transientSnapshot();
          }
          function closeTransientForTerminal() {
            transientInvocations.forEach(function(entry) {
              entry.assistantReconciliation = "closed";
              entry.text = "";
              entry.reconciliation = entry.reasoningText ? "retained" : "closed";
            });
            activeTransientInvocationId = null;
          }
          function append(kind, text2, displayTextKey) {
            var item = Object.freeze({ kind, text: safeText(text2), displayTextKey: typeof displayTextKey === "string" ? displayTextKey : null, presentationTurnId: activePresentationTurnId });
            items.push(item);
            return item;
          }
          function begin(message) {
            pending = true;
            presentationTurnSerial += 1;
            activePresentationTurnId = "presentation_turn_" + String(presentationTurnSerial);
            transientInvocations = [];
            activeTransientInvocationId = null;
            transientRuntimeGeneration = 0;
            append("user", message, null);
            return snapshot();
          }
          function apply(providerState) {
            var state = providerState && typeof providerState.state === "string" ? providerState.state : "failed";
            var text2 = providerState && typeof providerState.text === "string" ? providerState.text : "";
            var code = providerState && typeof providerState.errorCode === "string" ? providerState.errorCode : null;
            var intentReason = providerState && typeof providerState.intentReason === "string" ? providerState.intentReason : null;
            if (state === "pending") {
              pending = true;
              return snapshot();
            }
            if (!pending && proposalReviewPending && state === "proposal-ready") {
              return snapshot();
            }
            if (!pending && !proposalReviewPending) {
              return snapshot();
            }
            if (proposalReviewPending && (state === "proposal-reviewing" || state === "idle" || state === "local-proposal-handled")) {
              if (state === "idle" || state === "local-proposal-handled") {
                proposalReviewPending = false;
                if (code) {
                  terminalGeneration += 1;
                  append("error", "", errorDisplayKey(code));
                }
              }
              return snapshot();
            }
            pending = false;
            closeTransientForTerminal();
            terminalGeneration += 1;
            if (state === "completed") {
              if (text2) {
                append("assistant", text2, null);
              }
            } else if (state === "local-proposal-handled") {
            } else if (state === "proposal-ready") {
              proposalReviewPending = true;
              append("notice", "", "vela.surfaceLocalProposalNotice");
            } else if (state === "intent-rejected") {
              append("notice", "", intentReason === "target-mismatch" ? "vela.surfaceIntentTargetMismatch" : "vela.surfaceIntentRejected");
            } else if (state === "objective-blocked") {
              append(code === "REVIEW_REQUIRED" ? "notice" : "error", "", errorDisplayKey(code));
            } else if (state === "cancelled") {
              append("error", "", errorDisplayKey(code || "PROVIDER_REQUEST_ABORTED"));
            } else {
              append("error", "", errorDisplayKey(code || "PROVIDER_RESPONSE_INVALID"));
            }
            if (state !== "proposal-ready" && state !== "proposal-reviewing") {
              proposalReviewPending = false;
            }
            return snapshot();
          }
          function applyConfirmation(state, currentSnapshot) {
            var next = state && typeof state.state === "string" ? state.state : "idle";
            if (next === confirmationState) {
              return currentSnapshot || snapshot();
            }
            confirmationState = next;
            if (next === "confirmation-ready") {
              append("notice", "", state && (state.capabilityId === "set-layer-name-v1" || state.valueKind === "string") ? "vela.surfaceConfirmationLayerNameReady" : "vela.surfaceConfirmationReady");
            } else if (next === "rejected") {
              append("notice", "", "vela.surfaceConfirmationRejected");
            } else if (next === "execution-completed") {
              append("notice", "", "vela.surfaceExecutionCompleted");
            } else if (next === "execution-failed") {
              append("error", "", errorDisplayKey(state && state.errorCode));
            }
            return snapshot();
          }
          function filterConfirmationState(state) {
            var current = state && state.state;
            if (current === "confirmation-ready" || current === "executing") {
              suppressConfirmationTerminal = false;
            }
            if (suppressConfirmationTerminal && (current === "execution-completed" || current === "rejected" || current === "execution-failed")) {
              return Object.freeze({ state: "idle", beforeValue: null, proposedValue: null, errorCode: null, moduleRevision: state && state.moduleRevision || null });
            }
            return state;
          }
          function clearConfirmationTerminal() {
            suppressConfirmationTerminal = true;
            if (confirmationState === "execution-completed" || confirmationState === "rejected" || confirmationState === "execution-failed") {
              confirmationState = "idle";
            }
            return snapshot();
          }
          function reset() {
            suppressConfirmationTerminal = false;
            items = [];
            transientInvocations = [];
            activeTransientInvocationId = null;
            activePresentationTurnId = null;
            transientRuntimeGeneration = 0;
            pending = false;
            proposalReviewPending = false;
            confirmationState = "idle";
            terminalGeneration += 1;
            return snapshot();
          }
          return Object.freeze({ begin, apply, applyPresentationEvent, applyConfirmation, clearConfirmationTerminal, filterConfirmationState, reset, getSnapshot: snapshot, getTransientSnapshot: transientSnapshot });
        }
        return Object.freeze({ create, errorDisplayKey, projectSurfaceState, statusTone });
      });
    }
  });

  // client/reference/src/lab/registry-schema.js
  var REGISTRY_SCHEMAS = {
    "kit": {
      "id": "ecommerceLayout",
      "titleKey": "tools.adComponentKit.title",
      "descriptionKey": "tools.adComponentKit.description",
      "category": "layout",
      "iconText": "A",
      "storageKey": "AEToolbox.ecommerceLayout.v1",
      "stateAction": {
        "hostFunction": "AEToolbox.tools.adComponentKit.getState",
        "intervalMs": 1e3
      },
      "stateCard": {
        "titleKey": "tools.adComponentKit.sections.state",
        "fields": [
          {
            "stateKey": "activeComp",
            "labelKey": "tools.adComponentKit.state.activeComp"
          },
          {
            "stateKey": "selectionCount",
            "labelKey": "tools.adComponentKit.state.selectionCount"
          },
          {
            "stateKey": "textLayerCount",
            "labelKey": "tools.adComponentKit.state.textLayerCount"
          },
          {
            "stateKey": "twoDLayerCount",
            "labelKey": "tools.adComponentKit.state.twoDLayerCount"
          },
          {
            "stateKey": "selectedControllerType",
            "labelKey": "tools.adComponentKit.state.selectedControllerType"
          },
          {
            "stateKey": "canCreateFeatureStack",
            "labelKey": "tools.adComponentKit.state.canCreateFeatureStack"
          },
          {
            "stateKey": "canCreateIconGrid",
            "labelKey": "tools.adComponentKit.state.canCreateIconGrid"
          },
          {
            "stateKey": "canRemoveGeneratedComponent",
            "labelKey": "tools.adComponentKit.state.canRemoveGeneratedComponent"
          }
        ]
      },
      "sections": [
        {
          "id": "component",
          "labelKey": "tools.adComponentKit.sections.component",
          "descriptionKey": "tools.adComponentKit.sections.componentDescription",
          "fields": [
            {
              "type": "tabs",
              "key": "componentKind",
              "labelKey": "tools.adComponentKit.fields.componentKind",
              "defaultValue": "featureStack",
              "options": [
                {
                  "value": "featureStack",
                  "labelKey": "tools.adComponentKit.options.featureStack",
                  "descriptionKey": "tools.adComponentKit.options.featureStackDescription",
                  "iconText": "F"
                },
                {
                  "value": "iconGrid",
                  "labelKey": "tools.adComponentKit.options.iconGrid",
                  "descriptionKey": "tools.adComponentKit.options.iconGridDescription",
                  "iconText": "I"
                }
              ]
            },
            {
              "type": "divider",
              "visibleWhen": {
                "key": "componentKind",
                "equals": "featureStack"
              }
            },
            {
              "type": "range",
              "key": "gap",
              "labelKey": "tools.adComponentKit.fields.gap",
              "defaultValue": 14,
              "min": 0,
              "max": 100,
              "step": 1,
              "visibleWhen": {
                "key": "componentKind",
                "equals": "featureStack"
              }
            },
            {
              "type": "range",
              "key": "paddingX",
              "labelKey": "tools.adComponentKit.fields.paddingX",
              "defaultValue": 24,
              "min": 0,
              "max": 160,
              "step": 1,
              "visibleWhen": {
                "key": "componentKind",
                "equals": "featureStack"
              }
            },
            {
              "type": "range",
              "key": "paddingY",
              "labelKey": "tools.adComponentKit.fields.paddingY",
              "defaultValue": 12,
              "min": 0,
              "max": 100,
              "step": 1,
              "visibleWhen": {
                "key": "componentKind",
                "equals": "featureStack"
              }
            },
            {
              "type": "range",
              "key": "cornerRadius",
              "labelKey": "tools.adComponentKit.fields.cornerRadius",
              "defaultValue": 28,
              "min": 0,
              "max": 140,
              "step": 1,
              "visibleWhen": {
                "key": "componentKind",
                "equals": "featureStack"
              }
            },
            {
              "type": "color",
              "key": "fillColor",
              "labelKey": "tools.adComponentKit.fields.fillColor",
              "defaultValue": "#d6b25e",
              "visibleWhen": {
                "key": "componentKind",
                "equals": "featureStack"
              }
            },
            {
              "type": "select",
              "key": "pillWidthMode",
              "labelKey": "tools.adComponentKit.fields.pillWidthMode",
              "defaultValue": "auto",
              "visibleWhen": {
                "key": "componentKind",
                "equals": "featureStack"
              },
              "options": [
                {
                  "value": "auto",
                  "labelKey": "common.auto"
                },
                {
                  "value": "fixed",
                  "labelKey": "common.fixed"
                }
              ]
            },
            {
              "type": "number",
              "key": "fixedWidth",
              "labelKey": "tools.adComponentKit.fields.fixedWidth",
              "defaultValue": 320,
              "min": 80,
              "max": 900,
              "step": 1,
              "visibleWhen": {
                "key": "componentKind",
                "equals": "featureStack"
              }
            },
            {
              "type": "select",
              "key": "textAlign",
              "labelKey": "tools.adComponentKit.fields.textAlign",
              "defaultValue": "center",
              "visibleWhen": {
                "key": "componentKind",
                "equals": "featureStack"
              },
              "options": [
                {
                  "value": "center",
                  "labelKey": "common.center"
                },
                {
                  "value": "left",
                  "labelKey": "common.left"
                }
              ]
            },
            {
              "type": "select",
              "key": "sortMode",
              "labelKey": "tools.adComponentKit.fields.sortMode",
              "defaultValue": "yPosition",
              "visibleWhen": {
                "key": "componentKind",
                "equals": "featureStack"
              },
              "options": [
                {
                  "value": "yPosition",
                  "labelKey": "common.yPosition"
                },
                {
                  "value": "timeline",
                  "labelKey": "common.timeline"
                }
              ]
            },
            {
              "type": "button",
              "key": "createFeatureStack",
              "labelKey": "tools.adComponentKit.actions.createFeatureStack",
              "variant": "primary",
              "fullWidth": true,
              "actionId": "createFeatureStack",
              "visibleWhen": {
                "key": "componentKind",
                "equals": "featureStack"
              },
              "enabledWhen": {
                "stateKey": "canCreateFeatureStack",
                "equals": true
              },
              "refreshStateAfterRun": true,
              "pendingMessageKey": "tools.adComponentKit.status.creatingFeatureStack",
              "successMessageKey": "tools.adComponentKit.status.createdFeatureStack",
              "errorMessageKey": "tools.adComponentKit.status.createFeatureStackFailed"
            },
            {
              "type": "button",
              "key": "refreshSelectedComponentFeature",
              "labelKey": "tools.adComponentKit.actions.refreshSelectedComponent",
              "variant": "secondary",
              "fullWidth": true,
              "actionId": "refreshSelectedComponent",
              "visibleWhen": {
                "key": "componentKind",
                "equals": "featureStack"
              },
              "enabledWhen": {
                "stateKey": "canRefresh",
                "equals": true
              },
              "refreshStateAfterRun": true,
              "pendingMessageKey": "tools.adComponentKit.status.refreshingComponent",
              "successMessageKey": "tools.adComponentKit.status.componentRefreshed",
              "errorMessageKey": "tools.adComponentKit.status.componentMaintenanceFailed"
            },
            {
              "type": "button",
              "key": "selectComponentLayersFeature",
              "labelKey": "tools.adComponentKit.actions.selectComponentLayers",
              "variant": "secondary",
              "fullWidth": true,
              "actionId": "selectComponentLayers",
              "visibleWhen": {
                "key": "componentKind",
                "equals": "featureStack"
              },
              "enabledWhen": {
                "stateKey": "canSelectLayers",
                "equals": true
              },
              "refreshStateAfterRun": true,
              "pendingMessageKey": "tools.adComponentKit.status.selectingComponentLayers",
              "successMessageKey": "tools.adComponentKit.status.componentLayersSelected",
              "errorMessageKey": "tools.adComponentKit.status.componentMaintenanceFailed"
            },
            {
              "type": "button",
              "key": "removeSelectedGeneratedComponentFeature",
              "labelKey": "tools.adComponentKit.actions.removeSelectedGeneratedComponent",
              "variant": "secondary",
              "fullWidth": true,
              "actionId": "removeSelectedGeneratedComponent",
              "visibleWhen": {
                "key": "componentKind",
                "equals": "featureStack"
              },
              "enabledWhen": {
                "stateKey": "canRemoveGeneratedComponent",
                "equals": true
              },
              "refreshStateAfterRun": true,
              "pendingMessageKey": "tools.adComponentKit.status.removingGeneratedComponent",
              "successMessageKey": "tools.adComponentKit.status.generatedComponentRemoved",
              "errorMessageKey": "tools.adComponentKit.status.generatedComponentRemoveFailed"
            },
            {
              "type": "info",
              "labelKey": "tools.adComponentKit.notes.iconGridAdvanced",
              "visibleWhen": {
                "key": "componentKind",
                "equals": "iconGrid"
              }
            },
            {
              "type": "range",
              "key": "columns",
              "labelKey": "tools.adComponentKit.fields.columns",
              "defaultValue": 4,
              "min": 1,
              "max": 12,
              "step": 1,
              "visibleWhen": {
                "key": "componentKind",
                "equals": "iconGrid"
              }
            },
            {
              "type": "select",
              "key": "normalizeMode",
              "labelKey": "tools.adComponentKit.fields.normalizeMode",
              "defaultValue": "fitBox",
              "visibleWhen": {
                "key": "componentKind",
                "equals": "iconGrid"
              },
              "options": [
                {
                  "value": "none",
                  "labelKey": "common.none"
                },
                {
                  "value": "fitBox",
                  "labelKey": "common.fitBox"
                },
                {
                  "value": "uniformHeight",
                  "labelKey": "common.uniformHeight"
                },
                {
                  "value": "uniformWidth",
                  "labelKey": "common.uniformWidth"
                }
              ]
            },
            {
              "type": "range",
              "key": "targetWidth",
              "labelKey": "tools.adComponentKit.fields.targetWidth",
              "defaultValue": 72,
              "min": 1,
              "max": 400,
              "step": 1,
              "visibleWhen": {
                "key": "componentKind",
                "equals": "iconGrid"
              }
            },
            {
              "type": "range",
              "key": "targetHeight",
              "labelKey": "tools.adComponentKit.fields.targetHeight",
              "defaultValue": 72,
              "min": 1,
              "max": 400,
              "step": 1,
              "visibleWhen": {
                "key": "componentKind",
                "equals": "iconGrid"
              }
            },
            {
              "type": "range",
              "key": "cellWidth",
              "labelKey": "tools.adComponentKit.fields.cellWidth",
              "defaultValue": 100,
              "min": 1,
              "max": 600,
              "step": 1,
              "visibleWhen": {
                "key": "componentKind",
                "equals": "iconGrid"
              }
            },
            {
              "type": "range",
              "key": "cellHeight",
              "labelKey": "tools.adComponentKit.fields.cellHeight",
              "defaultValue": 118,
              "min": 1,
              "max": 600,
              "step": 1,
              "visibleWhen": {
                "key": "componentKind",
                "equals": "iconGrid"
              }
            },
            {
              "type": "range",
              "key": "gapX",
              "labelKey": "tools.adComponentKit.fields.gapX",
              "defaultValue": 28,
              "min": 0,
              "max": 240,
              "step": 1,
              "visibleWhen": {
                "key": "componentKind",
                "equals": "iconGrid"
              }
            },
            {
              "type": "range",
              "key": "gapY",
              "labelKey": "tools.adComponentKit.fields.gapY",
              "defaultValue": 24,
              "min": 0,
              "max": 240,
              "step": 1,
              "visibleWhen": {
                "key": "componentKind",
                "equals": "iconGrid"
              }
            },
            {
              "type": "select",
              "key": "lastRowAlign",
              "labelKey": "tools.adComponentKit.fields.lastRowAlign",
              "defaultValue": "center",
              "visibleWhen": {
                "key": "componentKind",
                "equals": "iconGrid"
              },
              "options": [
                {
                  "value": "left",
                  "labelKey": "common.left"
                },
                {
                  "value": "center",
                  "labelKey": "common.center"
                },
                {
                  "value": "right",
                  "labelKey": "common.right"
                }
              ]
            },
            {
              "type": "select",
              "key": "gridSortMode",
              "labelKey": "tools.adComponentKit.fields.gridSortMode",
              "defaultValue": "rowMajor",
              "visibleWhen": {
                "key": "componentKind",
                "equals": "iconGrid"
              },
              "options": [
                {
                  "value": "rowMajor",
                  "labelKey": "common.rowMajor"
                },
                {
                  "value": "xPosition",
                  "labelKey": "common.xPosition"
                },
                {
                  "value": "yPosition",
                  "labelKey": "common.yPosition"
                },
                {
                  "value": "timeline",
                  "labelKey": "common.timeline"
                }
              ]
            },
            {
              "type": "button",
              "key": "createIconGrid",
              "labelKey": "tools.adComponentKit.actions.createIconGrid",
              "variant": "primary",
              "fullWidth": true,
              "actionId": "createIconGrid",
              "visibleWhen": {
                "key": "componentKind",
                "equals": "iconGrid"
              },
              "enabledWhen": {
                "stateKey": "canCreateIconGrid",
                "equals": true
              },
              "refreshStateAfterRun": true,
              "pendingMessageKey": "tools.adComponentKit.status.creatingIconGrid",
              "successMessageKey": "tools.adComponentKit.status.createdIconGrid",
              "errorMessageKey": "tools.adComponentKit.status.createIconGridFailed"
            },
            {
              "type": "button",
              "key": "refreshSelectedComponentIcon",
              "labelKey": "tools.adComponentKit.actions.refreshSelectedComponent",
              "variant": "secondary",
              "fullWidth": true,
              "actionId": "refreshSelectedComponent",
              "visibleWhen": {
                "key": "componentKind",
                "equals": "iconGrid"
              },
              "enabledWhen": {
                "stateKey": "canRefresh",
                "equals": true
              },
              "refreshStateAfterRun": true,
              "pendingMessageKey": "tools.adComponentKit.status.refreshingComponent",
              "successMessageKey": "tools.adComponentKit.status.componentRefreshed",
              "errorMessageKey": "tools.adComponentKit.status.componentMaintenanceFailed"
            },
            {
              "type": "button",
              "key": "selectComponentLayersIcon",
              "labelKey": "tools.adComponentKit.actions.selectComponentLayers",
              "variant": "secondary",
              "fullWidth": true,
              "actionId": "selectComponentLayers",
              "visibleWhen": {
                "key": "componentKind",
                "equals": "iconGrid"
              },
              "enabledWhen": {
                "stateKey": "canSelectLayers",
                "equals": true
              },
              "refreshStateAfterRun": true,
              "pendingMessageKey": "tools.adComponentKit.status.selectingComponentLayers",
              "successMessageKey": "tools.adComponentKit.status.componentLayersSelected",
              "errorMessageKey": "tools.adComponentKit.status.componentMaintenanceFailed"
            },
            {
              "type": "button",
              "key": "removeSelectedGeneratedComponentIcon",
              "labelKey": "tools.adComponentKit.actions.removeSelectedGeneratedComponent",
              "variant": "secondary",
              "fullWidth": true,
              "actionId": "removeSelectedGeneratedComponent",
              "visibleWhen": {
                "key": "componentKind",
                "equals": "iconGrid"
              },
              "enabledWhen": {
                "stateKey": "canRemoveGeneratedComponent",
                "equals": true
              },
              "refreshStateAfterRun": true,
              "pendingMessageKey": "tools.adComponentKit.status.removingGeneratedComponent",
              "successMessageKey": "tools.adComponentKit.status.generatedComponentRemoved",
              "errorMessageKey": "tools.adComponentKit.status.generatedComponentRemoveFailed"
            }
          ]
        }
      ],
      "actions": [
        {
          "id": "createFeatureStack",
          "labelKey": "tools.adComponentKit.actions.createFeatureStack",
          "hostFunction": "AEToolbox.tools.adComponentKit.createFeatureStack",
          "style": "primary",
          "refreshStateAfterRun": true,
          "pendingMessageKey": "tools.adComponentKit.status.creatingFeatureStack",
          "successMessageKey": "tools.adComponentKit.status.createdFeatureStack",
          "errorMessageKey": "tools.adComponentKit.status.createFeatureStackFailed",
          "hidden": true,
          "fieldOnly": true
        },
        {
          "id": "createIconGrid",
          "labelKey": "tools.adComponentKit.actions.createIconGrid",
          "hostFunction": "AEToolbox.tools.adComponentKit.createIconGrid",
          "style": "primary",
          "refreshStateAfterRun": true,
          "pendingMessageKey": "tools.adComponentKit.status.creatingIconGrid",
          "successMessageKey": "tools.adComponentKit.status.createdIconGrid",
          "errorMessageKey": "tools.adComponentKit.status.createIconGridFailed",
          "hidden": true,
          "fieldOnly": true
        },
        {
          "id": "refreshSelectedComponent",
          "labelKey": "tools.adComponentKit.actions.refreshSelectedComponent",
          "hostFunction": "AEToolbox.tools.adComponentKit.refreshSelectedComponent",
          "refreshStateAfterRun": true,
          "pendingMessageKey": "tools.adComponentKit.status.refreshingComponent",
          "successMessageKey": "tools.adComponentKit.status.componentRefreshed",
          "errorMessageKey": "tools.adComponentKit.status.componentMaintenanceFailed",
          "hidden": true,
          "fieldOnly": true
        },
        {
          "id": "selectComponentLayers",
          "labelKey": "tools.adComponentKit.actions.selectComponentLayers",
          "hostFunction": "AEToolbox.tools.adComponentKit.selectComponentLayers",
          "refreshStateAfterRun": true,
          "pendingMessageKey": "tools.adComponentKit.status.selectingComponentLayers",
          "successMessageKey": "tools.adComponentKit.status.componentLayersSelected",
          "errorMessageKey": "tools.adComponentKit.status.componentMaintenanceFailed",
          "hidden": true,
          "fieldOnly": true
        },
        {
          "id": "removeSelectedGeneratedComponent",
          "labelKey": "tools.adComponentKit.actions.removeSelectedGeneratedComponent",
          "hostFunction": "AEToolbox.tools.adComponentKit.removeSelectedGeneratedComponent",
          "refreshStateAfterRun": true,
          "pendingMessageKey": "tools.adComponentKit.status.removingGeneratedComponent",
          "successMessageKey": "tools.adComponentKit.status.generatedComponentRemoved",
          "errorMessageKey": "tools.adComponentKit.status.generatedComponentRemoveFailed",
          "hidden": true,
          "fieldOnly": true
        }
      ],
      "i18n": {
        "en": {
          "tools.adComponentKit.title": "Ad Component Kit",
          "tools.adComponentKit.description": "Create text feature stacks, icon grids, and maintain generated ad components.",
          "tools.adComponentKit.sections.state": "Component State",
          "tools.adComponentKit.sections.component": "Component Builder",
          "tools.adComponentKit.sections.componentDescription": "Choose one component type and tune only the relevant settings.",
          "tools.adComponentKit.state.activeComp": "Active Comp",
          "tools.adComponentKit.state.selectionCount": "Selection",
          "tools.adComponentKit.state.textLayerCount": "Text Layers",
          "tools.adComponentKit.state.twoDLayerCount": "2D Layers",
          "tools.adComponentKit.state.selectedControllerType": "Controller",
          "tools.adComponentKit.state.canCreateFeatureStack": "Can Create Feature Stack",
          "tools.adComponentKit.state.canCreateIconGrid": "Can Create Icon Grid",
          "tools.adComponentKit.state.canRemoveGeneratedComponent": "Can Remove Generated Component",
          "tools.adComponentKit.fields.componentKind": "Component Type",
          "tools.adComponentKit.options.featureStack": "Feature Stack",
          "tools.adComponentKit.options.featureStackDescription": "Create centered pill rows from selected text layers.",
          "tools.adComponentKit.options.iconGrid": "Icon Grid",
          "tools.adComponentKit.options.iconGridDescription": "Arrange selected 2D layers into a normalized grid.",
          "tools.adComponentKit.fields.gap": "Gap",
          "tools.adComponentKit.fields.paddingX": "Padding X",
          "tools.adComponentKit.fields.paddingY": "Padding Y",
          "tools.adComponentKit.fields.cornerRadius": "Corner Radius",
          "tools.adComponentKit.fields.fillColor": "Fill Color",
          "tools.adComponentKit.fields.pillWidthMode": "Pill Width Mode",
          "tools.adComponentKit.fields.fixedWidth": "Fixed Width",
          "tools.adComponentKit.fields.textAlign": "Text Align",
          "tools.adComponentKit.fields.sortMode": "Sort",
          "tools.adComponentKit.fields.columns": "Columns",
          "tools.adComponentKit.fields.normalizeMode": "Normalize Mode",
          "tools.adComponentKit.fields.targetWidth": "Target Width",
          "tools.adComponentKit.fields.targetHeight": "Target Height",
          "tools.adComponentKit.fields.cellWidth": "Cell Width",
          "tools.adComponentKit.fields.cellHeight": "Cell Height",
          "tools.adComponentKit.fields.gapX": "Gap X",
          "tools.adComponentKit.fields.gapY": "Gap Y",
          "tools.adComponentKit.fields.lastRowAlign": "Last Row Align",
          "tools.adComponentKit.fields.gridSortMode": "Sort",
          "tools.adComponentKit.notes.iconGridAdvanced": "Icon Grid is kept in this unified tool, but it remains an advanced workflow.",
          "tools.adComponentKit.actions.createFeatureStack": "Create Feature Stack",
          "tools.adComponentKit.actions.createIconGrid": "Create Icon Grid",
          "tools.adComponentKit.actions.refreshSelectedComponent": "Refresh Selected Component",
          "tools.adComponentKit.actions.selectComponentLayers": "Select Component Layers",
          "tools.adComponentKit.actions.removeSelectedGeneratedComponent": "Remove Selected Generated Component",
          "tools.adComponentKit.status.creatingFeatureStack": "Creating Feature Stack...",
          "tools.adComponentKit.status.createdFeatureStack": "Feature Stack created.",
          "tools.adComponentKit.status.createFeatureStackFailed": "Select one or more text layers.",
          "tools.adComponentKit.status.creatingIconGrid": "Creating Icon Grid...",
          "tools.adComponentKit.status.createdIconGrid": "Icon Grid created.",
          "tools.adComponentKit.status.createIconGridFailed": "Select one or more supported 2D layers.",
          "tools.adComponentKit.status.refreshingComponent": "Refreshing selected component...",
          "tools.adComponentKit.status.componentRefreshed": "Component refreshed.",
          "tools.adComponentKit.status.selectingComponentLayers": "Selecting component layers...",
          "tools.adComponentKit.status.componentLayersSelected": "Component layers selected.",
          "tools.adComponentKit.status.removingGeneratedComponent": "Removing generated component...",
          "tools.adComponentKit.status.generatedComponentRemoved": "Generated component removed.",
          "tools.adComponentKit.status.generatedComponentRemoveFailed": "Select a new generated component layer with Lomond metadata.",
          "tools.adComponentKit.status.componentMaintenanceFailed": "Select a generated component controller."
        },
        "zh-CN": {
          "tools.adComponentKit.title": "电商组件工具箱",
          "tools.adComponentKit.description": "创建卖点胶囊、图标网格，并维护已生成的电商组件。",
          "tools.adComponentKit.sections.state": "组件状态",
          "tools.adComponentKit.sections.component": "组件构建",
          "tools.adComponentKit.sections.componentDescription": "选择一种组件类型，只调整相关参数。",
          "tools.adComponentKit.state.activeComp": "激活合成",
          "tools.adComponentKit.state.selectionCount": "选中数量",
          "tools.adComponentKit.state.textLayerCount": "文本层",
          "tools.adComponentKit.state.twoDLayerCount": "2D 图层",
          "tools.adComponentKit.state.selectedControllerType": "控制器",
          "tools.adComponentKit.state.canCreateFeatureStack": "可创建卖点胶囊",
          "tools.adComponentKit.state.canCreateIconGrid": "可创建图标网格",
          "tools.adComponentKit.state.canRemoveGeneratedComponent": "可移除生成组件",
          "tools.adComponentKit.fields.componentKind": "组件类型",
          "tools.adComponentKit.options.featureStack": "卖点胶囊",
          "tools.adComponentKit.options.featureStackDescription": "将选中文本层创建为居中胶囊行。",
          "tools.adComponentKit.options.iconGrid": "图标网格",
          "tools.adComponentKit.options.iconGridDescription": "将选中的 2D 图层排列为统一网格。",
          "tools.adComponentKit.fields.gap": "间距",
          "tools.adComponentKit.fields.paddingX": "Padding X",
          "tools.adComponentKit.fields.paddingY": "Padding Y",
          "tools.adComponentKit.fields.cornerRadius": "圆角半径",
          "tools.adComponentKit.fields.fillColor": "填充颜色",
          "tools.adComponentKit.fields.pillWidthMode": "胶囊宽度模式",
          "tools.adComponentKit.fields.fixedWidth": "固定宽度",
          "tools.adComponentKit.fields.textAlign": "文本对齐",
          "tools.adComponentKit.fields.sortMode": "排序",
          "tools.adComponentKit.fields.columns": "列数",
          "tools.adComponentKit.fields.normalizeMode": "统一尺寸模式",
          "tools.adComponentKit.fields.targetWidth": "目标宽度",
          "tools.adComponentKit.fields.targetHeight": "目标高度",
          "tools.adComponentKit.fields.cellWidth": "单元格宽度",
          "tools.adComponentKit.fields.cellHeight": "单元格高度",
          "tools.adComponentKit.fields.gapX": "间距 X",
          "tools.adComponentKit.fields.gapY": "间距 Y",
          "tools.adComponentKit.fields.lastRowAlign": "最后一行对齐",
          "tools.adComponentKit.fields.gridSortMode": "网格排序",
          "tools.adComponentKit.notes.iconGridAdvanced": "图标网格保留在统一工具中，但仍属于进阶工作流。",
          "tools.adComponentKit.actions.createFeatureStack": "创建卖点胶囊",
          "tools.adComponentKit.actions.createIconGrid": "创建图标网格",
          "tools.adComponentKit.actions.refreshSelectedComponent": "刷新选中组件",
          "tools.adComponentKit.actions.selectComponentLayers": "选择组件图层",
          "tools.adComponentKit.actions.removeSelectedGeneratedComponent": "移除选中生成组件",
          "tools.adComponentKit.status.creatingFeatureStack": "正在创建卖点胶囊...",
          "tools.adComponentKit.status.createdFeatureStack": "卖点胶囊已创建。",
          "tools.adComponentKit.status.createFeatureStackFailed": "请选择一个或多个文本层。",
          "tools.adComponentKit.status.creatingIconGrid": "正在创建图标网格...",
          "tools.adComponentKit.status.createdIconGrid": "图标网格已创建。",
          "tools.adComponentKit.status.createIconGridFailed": "请选择一个或多个受支持的 2D 图层。",
          "tools.adComponentKit.status.refreshingComponent": "正在刷新选中组件...",
          "tools.adComponentKit.status.componentRefreshed": "组件已刷新。",
          "tools.adComponentKit.status.selectingComponentLayers": "正在选择组件图层...",
          "tools.adComponentKit.status.componentLayersSelected": "已选择组件图层。",
          "tools.adComponentKit.status.removingGeneratedComponent": "正在移除生成组件...",
          "tools.adComponentKit.status.generatedComponentRemoved": "生成组件已移除。",
          "tools.adComponentKit.status.generatedComponentRemoveFailed": "请选择带有 Lomond metadata 的新生成组件图层。",
          "tools.adComponentKit.status.componentMaintenanceFailed": "请选择已生成的组件控制器。"
        }
      }
    },
    "controls": {
      "id": "registryControlLab",
      "titleKey": "tools.registryControlLab.title",
      "descriptionKey": "tools.registryControlLab.description",
      "category": "debug",
      "iconText": "C",
      "debugOnly": true,
      "controlLabCoverage": {
        "registryPath": [
          "text",
          "textarea",
          "number",
          "range",
          "select",
          "checkbox",
          "switch",
          "tabs",
          "color",
          "button",
          "actionButton",
          "divider",
          "separator",
          "info",
          "note",
          "subheading",
          "cubicBezier"
        ],
        "coreUiDirect": [
          "createFieldRow",
          "enhanceSelect",
          "createButton",
          "createShadowField"
        ],
        "buttonVariants": [
          "utility",
          "navigation"
        ],
        "colorFieldAlphaMode": true,
        "exemptions": {
          "proceduralPreview": "Domain-bound canvas specimen requires the Procedural Appearance Lab runtime."
        }
      },
      "stateAction": {
        "hostFunction": "AEToolbox.tools.registryControlLab.getState",
        "intervalMs": 1200
      },
      "stateCard": {
        "titleKey": "tools.registryControlLab.sections.state",
        "fields": [
          {
            "stateKey": "compName",
            "labelKey": "tools.registryControlLab.state.compName"
          },
          {
            "stateKey": "selectedCount",
            "labelKey": "tools.registryControlLab.state.selectedCount"
          },
          {
            "stateKey": "refreshCount",
            "labelKey": "tools.registryControlLab.state.refreshCount"
          }
        ]
      },
      "sections": [
        {
          "id": "basic",
          "labelKey": "tools.registryControlLab.sections.basic",
          "descriptionKey": "tools.registryControlLab.sections.basicDescription",
          "fields": [
            {
              "type": "subheading",
              "labelKey": "tools.registryControlLab.sections.registryPath"
            },
            {
              "type": "info",
              "labelKey": "tools.registryControlLab.notes.basic"
            },
            {
              "type": "text",
              "key": "textValue",
              "labelKey": "tools.registryControlLab.fields.textValue",
              "hintKey": "tools.registryControlLab.hints.textValue",
              "defaultValue": "Sample text"
            },
            {
              "type": "textarea",
              "key": "noteValue",
              "labelKey": "tools.registryControlLab.fields.noteValue",
              "hintKey": "tools.registryControlLab.hints.noteValue",
              "defaultValue": "Multiline note"
            },
            {
              "type": "divider"
            },
            {
              "type": "number",
              "key": "numberValue",
              "labelKey": "tools.registryControlLab.fields.numberValue",
              "hintKey": "tools.registryControlLab.hints.numberValue",
              "defaultValue": 12,
              "min": 0,
              "max": 100,
              "step": 1
            },
            {
              "type": "range",
              "key": "rangeValue",
              "labelKey": "tools.registryControlLab.fields.rangeValue",
              "hintKey": "tools.registryControlLab.hints.rangeValue",
              "defaultValue": 42,
              "min": 0,
              "max": 100,
              "step": 1
            }
          ]
        },
        {
          "id": "options",
          "labelKey": "tools.registryControlLab.sections.options",
          "descriptionKey": "tools.registryControlLab.sections.optionsDescription",
          "fields": [
            {
              "type": "switch",
              "key": "enabled",
              "labelKey": "tools.registryControlLab.fields.enabled",
              "hintKey": "tools.registryControlLab.hints.enabled",
              "defaultValue": true
            },
            {
              "type": "checkbox",
              "key": "acknowledged",
              "labelKey": "tools.registryControlLab.fields.acknowledged",
              "hintKey": "tools.registryControlLab.hints.acknowledged",
              "defaultValue": false
            },
            {
              "type": "select",
              "key": "mode",
              "labelKey": "tools.registryControlLab.fields.mode",
              "hintKey": "tools.registryControlLab.hints.mode",
              "defaultValue": "solid",
              "options": [
                {
                  "value": "none",
                  "labelKey": "common.none"
                },
                {
                  "value": "solid",
                  "labelKey": "common.solid"
                },
                {
                  "value": "gradient",
                  "labelKey": "common.gradient"
                }
              ]
            }
          ]
        },
        {
          "id": "colors",
          "labelKey": "tools.registryControlLab.sections.colors",
          "descriptionKey": "tools.registryControlLab.sections.colorsDescription",
          "fields": [
            {
              "type": "color",
              "key": "fillColor",
              "labelKey": "tools.registryControlLab.fields.fillColor",
              "hintKey": "tools.registryControlLab.hints.fillColor",
              "defaultValue": "#c9a452"
            },
            {
              "type": "color",
              "key": "strokeColor",
              "labelKey": "tools.registryControlLab.fields.strokeColor",
              "hintKey": "tools.registryControlLab.hints.strokeColor",
              "defaultValue": "#ffffff"
            }
          ]
        },
        {
          "id": "togglePanel",
          "labelKey": "tools.registryControlLab.sections.togglePanel",
          "descriptionKey": "tools.registryControlLab.sections.togglePanelDescription",
          "toggleKey": "enableTogglePanel",
          "defaultEnabled": true,
          "collapsible": true,
          "fields": [
            {
              "type": "text",
              "key": "toggleText",
              "labelKey": "tools.registryControlLab.fields.toggleText",
              "hintKey": "tools.registryControlLab.hints.toggleText",
              "defaultValue": "Enabled section"
            },
            {
              "type": "number",
              "key": "toggleNumber",
              "labelKey": "tools.registryControlLab.fields.toggleNumber",
              "hintKey": "tools.registryControlLab.hints.toggleNumber",
              "defaultValue": 8,
              "min": 0,
              "max": 20,
              "step": 1
            }
          ]
        },
        {
          "id": "bezierCurves",
          "labelKey": "tools.registryControlLab.sections.bezierCurves",
          "descriptionKey": "tools.registryControlLab.sections.bezierCurvesDescription",
          "collapsible": true,
          "fields": [
            {
              "type": "cubicBezier",
              "key": "defaultCurve",
              "labelKey": "tools.registryControlLab.fields.defaultCurve",
              "hintKey": "tools.registryControlLab.hints.defaultCurve",
              "defaultValue": {
                "x1": 0.25,
                "y1": 0.1,
                "x2": 0.25,
                "y2": 1
              },
              "progressLabelKey": "tools.registryControlLab.curve.progress",
              "speedLabelKey": "tools.registryControlLab.curve.speed",
              "point1LabelKey": "tools.registryControlLab.curve.point1",
              "point2LabelKey": "tools.registryControlLab.curve.point2"
            },
            {
              "type": "cubicBezier",
              "key": "overshootCurve",
              "labelKey": "tools.registryControlLab.fields.overshootCurve",
              "hintKey": "tools.registryControlLab.hints.overshootCurve",
              "defaultValue": {
                "x1": 0.2,
                "y1": -0.4,
                "x2": 0.35,
                "y2": 1.45
              },
              "initialView": "speed",
              "progressLabelKey": "tools.registryControlLab.curve.progress",
              "speedLabelKey": "tools.registryControlLab.curve.speed",
              "point1LabelKey": "tools.registryControlLab.curve.point1",
              "point2LabelKey": "tools.registryControlLab.curve.point2"
            },
            {
              "type": "cubicBezier",
              "key": "readonlyCurve",
              "labelKey": "tools.registryControlLab.fields.readonlyCurve",
              "hintKey": "tools.registryControlLab.hints.readonlyCurve",
              "defaultValue": {
                "x1": 0.42,
                "y1": 0,
                "x2": 0.58,
                "y2": 1
              },
              "readonly": true
            },
            {
              "type": "cubicBezier",
              "key": "disabledCurve",
              "labelKey": "tools.registryControlLab.fields.disabledCurve",
              "hintKey": "tools.registryControlLab.hints.disabledCurve",
              "defaultValue": {
                "x1": 0.3,
                "y1": 0,
                "x2": 0.7,
                "y2": 1
              },
              "disabled": true
            }
          ]
        },
        {
          "id": "actions",
          "labelKey": "tools.registryControlLab.sections.actions",
          "descriptionKey": "tools.registryControlLab.sections.actionsDescription",
          "composition": "actionStack",
          "fields": [
            {
              "type": "button",
              "key": "secondaryButton",
              "labelKey": "tools.registryControlLab.actions.secondaryButton",
              "variant": "secondary",
              "fullWidth": true,
              "actionId": "previewValues"
            },
            {
              "type": "button",
              "key": "primaryButton",
              "labelKey": "tools.registryControlLab.actions.primaryButton",
              "variant": "primary",
              "fullWidth": true,
              "actionId": "previewValues"
            },
            {
              "type": "button",
              "key": "dangerButton",
              "labelKey": "tools.registryControlLab.actions.dangerButton",
              "variant": "danger",
              "fullWidth": true,
              "actionId": "previewValues"
            },
            {
              "type": "button",
              "key": "bilingualButton",
              "labelKey": "tools.registryControlLab.actions.bilingualButton",
              "secondaryText": "rectangle",
              "secondaryTextType": "matchName",
              "textLayout": "centerAxisPair",
              "variant": "secondary",
              "fullWidth": true,
              "actionId": "previewValues"
            }
          ]
        },
        {
          "id": "actionState",
          "labelKey": "tools.registryControlLab.sections.actionState",
          "descriptionKey": "tools.registryControlLab.sections.actionStateDescription",
          "fields": [
            {
              "type": "info",
              "labelKey": "tools.registryControlLab.notes.actionState"
            },
            {
              "type": "button",
              "key": "payloadButton",
              "labelKey": "tools.registryControlLab.actions.payloadButton",
              "secondaryText": "payload",
              "textLayout": "centerAxisPair",
              "variant": "secondary",
              "fullWidth": true,
              "actionId": "previewValues",
              "actionPayload": {
                "payloadKey": "rectangle",
                "matchName": "ADBE Vector Shape - Rect",
                "omitMessageKey": true
              },
              "pendingMessageKey": "tools.registryControlLab.status.payloadPending",
              "successMessageKey": "tools.registryControlLab.status.payloadReceived",
              "errorMessageKey": "tools.registryControlLab.status.payloadFailed"
            },
            {
              "type": "button",
              "key": "stateDisabledButton",
              "labelKey": "tools.registryControlLab.actions.stateDisabledButton",
              "variant": "secondary",
              "fullWidth": true,
              "actionId": "previewValues",
              "enabledWhen": {
                "stateKey": "hasComp",
                "equals": true
              },
              "actionPayload": {
                "source": "stateDisabledButton"
              },
              "pendingMessageKey": "tools.registryControlLab.status.stateButtonPending",
              "successMessageKey": "tools.registryControlLab.status.stateButtonSuccess"
            },
            {
              "type": "button",
              "key": "fallbackErrorButton",
              "labelKey": "tools.registryControlLab.actions.fallbackErrorButton",
              "variant": "secondary",
              "fullWidth": true,
              "actionId": "previewValues",
              "actionPayload": {
                "source": "fallbackErrorButton",
                "forceError": true
              },
              "pendingMessageKey": "tools.registryControlLab.status.fallbackErrorPending",
              "errorMessageKey": "tools.registryControlLab.status.fallbackErrorShown"
            },
            {
              "type": "button",
              "key": "refreshAfterRunButton",
              "labelKey": "tools.registryControlLab.actions.refreshAfterRunButton",
              "variant": "primary",
              "fullWidth": true,
              "actionId": "previewValues",
              "refreshStateAfterRun": true,
              "actionPayload": {
                "source": "refreshAfterRunButton"
              },
              "pendingMessageKey": "tools.registryControlLab.status.refreshAfterRunPending",
              "successMessageKey": "tools.registryControlLab.status.refreshAfterRunSuccess"
            }
          ]
        },
        {
          "id": "tabs",
          "labelKey": "tools.registryControlLab.sections.tabs",
          "descriptionKey": "tools.registryControlLab.sections.tabsDescription",
          "fields": [
            {
              "type": "tabs",
              "key": "componentType",
              "labelKey": "tools.registryControlLab.fields.componentType",
              "hintKey": "tools.registryControlLab.hints.componentType",
              "defaultValue": "feature",
              "options": [
                {
                  "value": "feature",
                  "labelKey": "tools.registryControlLab.options.feature",
                  "descriptionKey": "tools.registryControlLab.options.featureDescription",
                  "iconText": "F"
                },
                {
                  "value": "grid",
                  "labelKey": "tools.registryControlLab.options.grid",
                  "descriptionKey": "tools.registryControlLab.options.gridDescription",
                  "iconText": "G"
                },
                {
                  "value": "longDisabled",
                  "labelKey": "tools.registryControlLab.options.longDisabled",
                  "descriptionKey": "tools.registryControlLab.options.longDisabledDescription",
                  "iconText": "L",
                  "disabled": true
                }
              ]
            },
            {
              "type": "number",
              "key": "featureOnlyGap",
              "labelKey": "tools.registryControlLab.fields.featureOnlyGap",
              "defaultValue": 24,
              "min": 0,
              "step": 1,
              "visibleWhen": {
                "key": "componentType",
                "equals": "feature"
              }
            },
            {
              "type": "number",
              "key": "gridOnlyColumns",
              "labelKey": "tools.registryControlLab.fields.gridOnlyColumns",
              "defaultValue": 4,
              "min": 1,
              "max": 12,
              "step": 1,
              "visibleWhen": {
                "key": "componentType",
                "equals": "grid"
              }
            }
          ]
        }
      ],
      "actions": [
        {
          "id": "previewValues",
          "labelKey": "tools.registryControlLab.actions.previewValues",
          "hostFunction": "AEToolbox.tools.registryControlLab.previewValues",
          "style": "primary",
          "refreshStateAfterRun": true,
          "pendingMessageKey": "tools.registryControlLab.status.previewPending",
          "successMessageKey": "tools.registryControlLab.status.previewed",
          "errorMessageKey": "tools.registryControlLab.status.previewFailed"
        }
      ],
      "i18n": {
        "en": {
          "tools.registryControlLab.title": "Registry Control Lab",
          "tools.registryControlLab.description": "Test the shared registry renderer with every standard control type.",
          "tools.registryControlLab.sections.basic": "Basic Controls",
          "tools.registryControlLab.sections.registryPath": "Registry Path",
          "tools.registryControlLab.sections.coreUiDirect": "CoreUI Direct",
          "tools.registryControlLab.fields.shadowField": "Shadow Field",
          "tools.registryControlLab.fields.colorAlphaField": "Color + Alpha Field",
          "tools.registryControlLab.sections.basicDescription": "Text, textarea, numeric entry, and slider behavior.",
          "tools.registryControlLab.sections.colors": "Colors",
          "tools.registryControlLab.sections.colorsDescription": "Color pills, hex values, and the HSV picker.",
          "tools.registryControlLab.sections.options": "Options",
          "tools.registryControlLab.sections.optionsDescription": "Switch and select controls using the shared black-gold UI.",
          "tools.registryControlLab.sections.togglePanel": "Toggle Section",
          "tools.registryControlLab.sections.togglePanelDescription": "Tests section-level enable and collapse behavior.",
          "tools.registryControlLab.sections.actions": "Large Buttons",
          "tools.registryControlLab.sections.actionsDescription": "Tests full-width registry action buttons and center-axis text layout.",
          "tools.registryControlLab.sections.tabs": "Tabs",
          "tools.registryControlLab.sections.tabsDescription": "Tests option cards and conditional field visibility.",
          "tools.registryControlLab.sections.bezierCurves": "Cubic Bezier Curves",
          "tools.registryControlLab.sections.bezierCurvesDescription": "Generic Progress and Speed editing with structured curve values.",
          "tools.registryControlLab.sections.state": "Host State",
          "tools.registryControlLab.sections.actionState": "Action and State",
          "tools.registryControlLab.sections.actionStateDescription": "Action payloads, state-driven disabled buttons, and state refresh hooks.",
          "tools.registryControlLab.fields.textValue": "Text",
          "tools.registryControlLab.fields.noteValue": "Note",
          "tools.registryControlLab.fields.numberValue": "Number",
          "tools.registryControlLab.fields.rangeValue": "Range",
          "tools.registryControlLab.fields.enabled": "Enabled",
          "tools.registryControlLab.fields.acknowledged": "Acknowledge this selection",
          "tools.registryControlLab.fields.mode": "Mode",
          "tools.registryControlLab.fields.fillColor": "Fill Color",
          "tools.registryControlLab.fields.strokeColor": "Stroke Color",
          "tools.registryControlLab.fields.toggleText": "Toggle Text",
          "tools.registryControlLab.fields.toggleNumber": "Toggle Number",
          "tools.registryControlLab.fields.componentType": "Component Type",
          "tools.registryControlLab.fields.featureOnlyGap": "Feature Gap",
          "tools.registryControlLab.fields.gridOnlyColumns": "Grid Columns",
          "tools.registryControlLab.fields.defaultCurve": "Default Curve",
          "tools.registryControlLab.fields.overshootCurve": "Overshoot Curve",
          "tools.registryControlLab.fields.readonlyCurve": "Readonly Curve",
          "tools.registryControlLab.fields.disabledCurve": "Disabled Curve",
          "tools.registryControlLab.curve.progress": "Progress / Value",
          "tools.registryControlLab.curve.speed": "Speed",
          "tools.registryControlLab.curve.point1": "Control Point 1",
          "tools.registryControlLab.curve.point2": "Control Point 2",
          "tools.registryControlLab.actions.previewValues": "Preview Values",
          "tools.registryControlLab.actions.secondaryButton": "Secondary Full-width Button",
          "tools.registryControlLab.actions.primaryButton": "Primary Full-width Button",
          "tools.registryControlLab.actions.dangerButton": "Danger Action Test",
          "tools.registryControlLab.actions.bilingualButton": "Rectangle",
          "tools.registryControlLab.actions.payloadButton": "Send Payload",
          "tools.registryControlLab.actions.stateDisabledButton": "Requires Active Comp",
          "tools.registryControlLab.actions.fallbackErrorButton": "Test Error Fallback",
          "tools.registryControlLab.actions.refreshAfterRunButton": "Run and Refresh State",
          "tools.registryControlLab.options.feature": "Feature",
          "tools.registryControlLab.options.grid": "Grid",
          "tools.registryControlLab.options.longDisabled": "Unavailable long-label option",
          "tools.registryControlLab.options.featureDescription": "Show feature-only fields.",
          "tools.registryControlLab.options.gridDescription": "Show grid-only fields.",
          "tools.registryControlLab.options.longDisabledDescription": "Disabled supporting copy for narrow and typography stress.",
          "tools.registryControlLab.status.previewed": "Received registry control values.",
          "tools.registryControlLab.status.previewPending": "Sending registry control values...",
          "tools.registryControlLab.status.previewFailed": "Registry control preview failed.",
          "tools.registryControlLab.status.stateRefreshed": "Registry host state refreshed.",
          "tools.registryControlLab.status.payloadPending": "Sending action payload...",
          "tools.registryControlLab.status.payloadReceived": "Action payload received.",
          "tools.registryControlLab.status.payloadFailed": "Action payload failed.",
          "tools.registryControlLab.status.stateButtonPending": "Running state-gated action...",
          "tools.registryControlLab.status.stateButtonSuccess": "State-gated action completed.",
          "tools.registryControlLab.status.fallbackErrorPending": "Testing error fallback...",
          "tools.registryControlLab.status.fallbackErrorShown": "Action-specific error fallback shown.",
          "tools.registryControlLab.status.refreshAfterRunPending": "Running action and refreshing state...",
          "tools.registryControlLab.status.refreshAfterRunSuccess": "Action completed and state refreshed.",
          "tools.registryControlLab.state.compName": "Comp",
          "tools.registryControlLab.state.selectedCount": "Selected Layers",
          "tools.registryControlLab.state.refreshCount": "Refresh Count",
          "tools.registryControlLab.notes.basic": "This lab validates shared controls only. It does not modify After Effects layers.",
          "tools.registryControlLab.notes.actionState": "Open a composition to enable the state-gated button. Payload values are sent only with that action and are not persisted.",
          "tools.registryControlLab.hints.textValue": "Single-line text input.",
          "tools.registryControlLab.hints.noteValue": "Multiline text area.",
          "tools.registryControlLab.hints.numberValue": "Type a value or drag horizontally.",
          "tools.registryControlLab.hints.rangeValue": "Number box and slider stay synchronized.",
          "tools.registryControlLab.hints.enabled": "Keeps the existing switch visual style.",
          "tools.registryControlLab.hints.acknowledged": "Checkboxes represent acknowledgement or selection, not an immediate feature toggle.",
          "tools.registryControlLab.hints.mode": "Uses the existing custom select menu.",
          "tools.registryControlLab.hints.fillColor": "Opens the custom HSV color picker.",
          "tools.registryControlLab.hints.strokeColor": "Returns a normalized #rrggbb value.",
          "tools.registryControlLab.hints.toggleText": "This field is muted while the section is disabled.",
          "tools.registryControlLab.hints.toggleNumber": "The toggle value is still collected with form values.",
          "tools.registryControlLab.hints.componentType": "Switch tabs to test visibleWhen field behavior.",
          "tools.registryControlLab.hints.defaultCurve": "Edit P1/P2 by graph, keyboard, numeric input, or scrub.",
          "tools.registryControlLab.hints.overshootCurve": "Y values outside 0-1 remain valid and expand the viewport.",
          "tools.registryControlLab.hints.readonlyCurve": "View switching remains available while curve editing is locked.",
          "tools.registryControlLab.hints.disabledCurve": "All graph, view, and numeric interactions are disabled."
        },
        "zh-CN": {
          "tools.registryControlLab.title": "控件测试实验室",
          "tools.registryControlLab.description": "用于验证共用 registry renderer 的所有标准控件类型。",
          "tools.registryControlLab.sections.basic": "基础控件",
          "tools.registryControlLab.sections.registryPath": "Registry 路径",
          "tools.registryControlLab.sections.coreUiDirect": "CoreUI 直接路径",
          "tools.registryControlLab.fields.shadowField": "阴影字段",
          "tools.registryControlLab.fields.colorAlphaField": "颜色 + Alpha 字段",
          "tools.registryControlLab.sections.basicDescription": "验证文本、多行文本、数值输入和滑杆行为。",
          "tools.registryControlLab.sections.colors": "颜色",
          "tools.registryControlLab.sections.colorsDescription": "验证色块、Hex 值和 HSV 取色器。",
          "tools.registryControlLab.sections.options": "选项",
          "tools.registryControlLab.sections.optionsDescription": "使用共用黑金 UI 的开关和下拉控件。",
          "tools.registryControlLab.sections.togglePanel": "分区开关",
          "tools.registryControlLab.sections.togglePanelDescription": "验证分区级启用和折叠行为。",
          "tools.registryControlLab.sections.actions": "大型按钮",
          "tools.registryControlLab.sections.actionsDescription": "验证横向填满的 registry action button 和中轴双文本布局。",
          "tools.registryControlLab.sections.tabs": "标签页",
          "tools.registryControlLab.sections.tabsDescription": "验证选项卡和条件字段显隐。",
          "tools.registryControlLab.sections.bezierCurves": "三次贝塞尔曲线",
          "tools.registryControlLab.sections.bezierCurvesDescription": "使用结构化曲线值验证通用进度与速度编辑。",
          "tools.registryControlLab.sections.state": "Host 状态",
          "tools.registryControlLab.sections.actionState": "操作与状态",
          "tools.registryControlLab.sections.actionStateDescription": "验证 action payload、状态驱动的禁用按钮和执行后状态刷新。",
          "tools.registryControlLab.fields.textValue": "文本",
          "tools.registryControlLab.fields.noteValue": "备注",
          "tools.registryControlLab.fields.numberValue": "数值",
          "tools.registryControlLab.fields.rangeValue": "滑杆",
          "tools.registryControlLab.fields.enabled": "启用",
          "tools.registryControlLab.fields.acknowledged": "确认此选择",
          "tools.registryControlLab.fields.mode": "模式",
          "tools.registryControlLab.fields.fillColor": "填充颜色",
          "tools.registryControlLab.fields.strokeColor": "描边颜色",
          "tools.registryControlLab.fields.toggleText": "开关文本",
          "tools.registryControlLab.fields.toggleNumber": "开关数值",
          "tools.registryControlLab.fields.componentType": "组件类型",
          "tools.registryControlLab.fields.featureOnlyGap": "卖点间距",
          "tools.registryControlLab.fields.gridOnlyColumns": "网格列数",
          "tools.registryControlLab.fields.defaultCurve": "默认曲线",
          "tools.registryControlLab.fields.overshootCurve": "超调曲线",
          "tools.registryControlLab.fields.readonlyCurve": "只读曲线",
          "tools.registryControlLab.fields.disabledCurve": "禁用曲线",
          "tools.registryControlLab.curve.progress": "进度 / 值",
          "tools.registryControlLab.curve.speed": "速度",
          "tools.registryControlLab.curve.point1": "控制点 1",
          "tools.registryControlLab.curve.point2": "控制点 2",
          "tools.registryControlLab.actions.previewValues": "预览参数",
          "tools.registryControlLab.actions.secondaryButton": "次要横向按钮",
          "tools.registryControlLab.actions.primaryButton": "主要横向按钮",
          "tools.registryControlLab.actions.dangerButton": "危险操作测试",
          "tools.registryControlLab.actions.bilingualButton": "矩形",
          "tools.registryControlLab.actions.payloadButton": "发送 Payload",
          "tools.registryControlLab.actions.stateDisabledButton": "需要激活合成",
          "tools.registryControlLab.actions.fallbackErrorButton": "测试错误 Fallback",
          "tools.registryControlLab.actions.refreshAfterRunButton": "执行并刷新状态",
          "tools.registryControlLab.options.feature": "卖点",
          "tools.registryControlLab.options.grid": "网格",
          "tools.registryControlLab.options.longDisabled": "不可用的长标签选项",
          "tools.registryControlLab.options.featureDescription": "显示卖点专属字段。",
          "tools.registryControlLab.options.gridDescription": "显示网格专属字段。",
          "tools.registryControlLab.options.longDisabledDescription": "用于窄布局和排版压力验证的禁用说明。",
          "tools.registryControlLab.status.previewed": "已接收 registry 控件参数。",
          "tools.registryControlLab.status.previewPending": "正在发送 registry 控件参数...",
          "tools.registryControlLab.status.previewFailed": "Registry 控件预览失败。",
          "tools.registryControlLab.status.stateRefreshed": "Registry host 状态已刷新。",
          "tools.registryControlLab.status.payloadPending": "正在发送 action payload...",
          "tools.registryControlLab.status.payloadReceived": "Action payload 已接收。",
          "tools.registryControlLab.status.payloadFailed": "Action payload 失败。",
          "tools.registryControlLab.status.stateButtonPending": "正在执行状态限制操作...",
          "tools.registryControlLab.status.stateButtonSuccess": "状态限制操作已完成。",
          "tools.registryControlLab.status.fallbackErrorPending": "正在测试错误 fallback...",
          "tools.registryControlLab.status.fallbackErrorShown": "已显示 action 专属错误 fallback。",
          "tools.registryControlLab.status.refreshAfterRunPending": "正在执行并刷新状态...",
          "tools.registryControlLab.status.refreshAfterRunSuccess": "操作已完成，状态已刷新。",
          "tools.registryControlLab.state.compName": "合成",
          "tools.registryControlLab.state.selectedCount": "选中图层",
          "tools.registryControlLab.state.refreshCount": "刷新次数",
          "tools.registryControlLab.notes.basic": "该实验室只验证共用控件，不修改 After Effects 图层。",
          "tools.registryControlLab.notes.actionState": "打开合成后，状态限制按钮会变为可用。Payload 只随本次 action 发送，不会持久化。",
          "tools.registryControlLab.hints.textValue": "单行文本输入。",
          "tools.registryControlLab.hints.noteValue": "多行文本区域。",
          "tools.registryControlLab.hints.numberValue": "可输入数值，也可横向拖动修改。",
          "tools.registryControlLab.hints.rangeValue": "数值框和滑杆保持同步。",
          "tools.registryControlLab.hints.enabled": "保留现有开关视觉风格。",
          "tools.registryControlLab.hints.acknowledged": "复选框表示确认或选择，而不是立即功能开关。",
          "tools.registryControlLab.hints.mode": "使用现有自定义下拉菜单。",
          "tools.registryControlLab.hints.fillColor": "打开自定义 HSV 取色器。",
          "tools.registryControlLab.hints.strokeColor": "返回标准化的 #rrggbb 值。",
          "tools.registryControlLab.hints.toggleText": "分区关闭时该字段会弱化显示。",
          "tools.registryControlLab.hints.toggleNumber": "分区开关值会随表单参数一起收集。",
          "tools.registryControlLab.hints.componentType": "切换标签页以测试 visibleWhen 字段显隐。",
          "tools.registryControlLab.hints.defaultCurve": "可通过图形、键盘、数值输入或拖擦编辑 P1/P2。",
          "tools.registryControlLab.hints.overshootCurve": "0-1 之外的 Y 值仍然合法，并会扩展视口。",
          "tools.registryControlLab.hints.readonlyCurve": "曲线编辑锁定时仍可切换视图。",
          "tools.registryControlLab.hints.disabledCurve": "禁用所有图形、视图与数值交互。"
        }
      }
    }
  };

  // client/reference/src/lab/registry-model.js
  var clone = (value2) => structuredClone(value2);
  var registryFields = (schema2) => (schema2.sections || []).flatMap((section) => section.fields || []);
  var common = { auto: "Auto", fixed: "Fixed", center: "Center", left: "Left", right: "Right", yPosition: "Y position", xPosition: "X position", timeline: "Timeline", none: "None", fitBox: "Fit box", uniformHeight: "Uniform height", uniformWidth: "Uniform width", rowMajor: "Row major", solid: "Solid", gradient: "Gradient" };
  var commonZh = { auto: "自动", fixed: "固定", center: "居中", left: "左对齐", right: "右对齐", yPosition: "Y 位置", xPosition: "X 位置", timeline: "时间线", none: "无", fitBox: "适合边框", uniformHeight: "统一高度", uniformWidth: "统一宽度", rowMajor: "按行排列", solid: "纯色", gradient: "渐变" };
  function label(schema2, key, lang = "en") {
    return schema2.i18n?.[lang]?.[key] ?? schema2.i18n?.en?.[key] ?? (lang === "zh-CN" ? commonZh : common)[key?.replace("common.", "")] ?? key ?? "";
  }
  function defaults(schema2) {
    const values = {};
    for (const section of schema2.sections || []) {
      if (section.toggleKey) values[section.toggleKey] = section.defaultEnabled !== false;
      for (const field2 of section.fields || []) if (field2.key && field2.defaultValue !== void 0) values[field2.key] = clone(field2.defaultValue);
    }
    return values;
  }
  function condition(rule, values, state) {
    if (!rule) return true;
    if (Array.isArray(rule)) return rule.every((r) => condition(r, values, state));
    const value2 = rule.stateKey ? state[rule.stateKey] : values[rule.key];
    if (Object.hasOwn(rule, "equals")) return value2 === rule.equals;
    if (Object.hasOwn(rule, "notEquals")) return value2 !== rule.notEquals;
    return !!value2;
  }
  function normalizeField(field2, value2) {
    if (["switch", "checkbox"].includes(field2.type)) return !!value2;
    if (["number", "range"].includes(field2.type)) {
      if (value2 === "" || !Number.isFinite(Number(value2))) return void 0;
      const n = Math.max(field2.min ?? -Infinity, Math.min(field2.max ?? Infinity, Number(value2))), step = field2.step || 1, base = field2.min || 0;
      return Number(Math.max(field2.min ?? -Infinity, Math.min(field2.max ?? Infinity, base + Math.round((n - base) / step) * step)).toFixed(6));
    }
    if (["select", "tabs"].includes(field2.type)) return field2.options.some((o) => o.value === value2 && !o.disabled) ? value2 : void 0;
    if (field2.type === "color") return /^#[0-9a-f]{6}$/i.test(value2) ? value2.toUpperCase() : void 0;
    if (field2.type === "cubicBezier") {
      const v = Object.fromEntries(["x1", "y1", "x2", "y2"].map((k) => [k, Number(value2?.[k])]));
      if (Object.values(v).some((n) => !Number.isFinite(n))) return void 0;
      for (const k of ["x1", "x2"]) v[k] = Math.max(0, Math.min(1, v[k]));
      for (const k of ["y1", "y2"]) v[k] = Math.max(-4, Math.min(4, v[k]));
      return v;
    }
    return String(value2 ?? "");
  }
  var CONTEXTS = [["text", "3 text layers"], ["shapes", "6 shape layers"], ["component", "Existing component"], ["empty", "No selection"], ["noComp", "No composition"]];
  var RegistrySession = class {
    constructor(id, saved) {
      this.id = id;
      this.schema = REGISTRY_SCHEMAS[id];
      if (!this.schema) throw new Error("Unknown registry tool");
      this.values = defaults(this.schema);
      this.context = id === "shape" ? "shapes" : "text";
      this.generated = null;
      this.refreshCount = 1;
      this.items = [];
      this.lastResult = null;
      if (saved) {
        this.context = CONTEXTS.some(([k]) => k === saved.context) ? saved.context : this.context;
        this.generated = saved.generated || null;
        this.refreshCount = saved.refreshCount || 1;
        this.items = clone(saved.items || []);
        this.lastResult = clone(saved.lastResult || null);
        for (const field2 of registryFields(this.schema)) {
          if (saved.values?.[field2.key] === void 0) continue;
          const v = normalizeField(field2, saved.values[field2.key]);
          if (v !== void 0) this.values[field2.key] = v;
        }
        for (const s of this.schema.sections || []) if (s.toggleKey && typeof saved.values?.[s.toggleKey] === "boolean") this.values[s.toggleKey] = saved.values[s.toggleKey];
      }
    }
    get state() {
      const hasComp = this.context !== "noComp", hasComponent = hasComp && (!!this.generated || this.context === "component"), count = !hasComp || this.context === "empty" ? 0 : this.context === "shapes" ? 6 : 3, textCount = this.context === "text" || hasComponent ? count : 0;
      return { hasComp, activeComp: hasComp ? "Opening titles" : "—", compName: hasComp ? "Opening titles" : "—", selectionCount: count, selectedCount: count, textLayerCount: textCount, twoDLayerCount: count, selectedControllerType: hasComponent ? this.generated || "featureStack" : "—", canCreateFeatureStack: hasComp && textCount > 0, canCreateIconGrid: hasComp && count > 0, canRefresh: hasComponent, canSelectLayers: hasComponent, canRemoveGeneratedComponent: hasComponent, canAdd: hasComp && (this.context === "shapes" || hasComponent), targetLabel: hasComp && (this.context === "shapes" || hasComponent) ? "Shape layer / Contents" : "—", source: hasComp && count ? "Selection" : "—", refreshCount: this.refreshCount };
    }
    field(key) {
      return registryFields(this.schema).find((f) => f.key === key);
    }
    section(field2) {
      return (this.schema.sections || []).find((s) => s.fields.includes(field2));
    }
    visible(field2) {
      return condition(field2.visibleWhen, this.values, this.state);
    }
    enabled(field2) {
      const section = this.section(field2);
      return !field2.disabled && !(section?.toggleKey && !this.values[section.toggleKey]) && condition(field2.enabledWhen, this.values, this.state);
    }
    set(key, value2) {
      const field2 = this.field(key);
      if (!field2 || !this.visible(field2) || !this.enabled(field2) || field2.readonly) return false;
      const next = normalizeField(field2, value2);
      if (next === void 0) return false;
      this.values[key] = next;
      return true;
    }
    setContext(context) {
      if (CONTEXTS.some(([k]) => k === context)) {
        this.context = context;
        this.generated = null;
        this.items = [];
        this.lastResult = null;
      }
    }
    action(key) {
      return this.field(key) || this.schema.actions.find((a) => a.id === key);
    }
    payload(action) {
      return { ...clone(this.values), ...clone(action.actionPayload || {}) };
    }
    run(key) {
      const field2 = this.action(key);
      if (!field2 || !this.visible(field2) || !this.enabled(field2)) return null;
      if (field2.clientAction === "resetFields") {
        const original = defaults(this.schema);
        for (const k of field2.resetKeys || []) this.values[k] = clone(original[k]);
        return this.lastResult = { ok: true, preview: true, action: "resetFields" };
      }
      const action = this.schema.actions.find((a) => a.id === (field2.actionId || field2.id));
      if (!action) return null;
      const payload = this.payload(field2), ok = !payload.forceError;
      if (ok) {
        if (action.id === "createFeatureStack" || action.id === "createIconGrid") this.generated = action.id === "createFeatureStack" ? "featureStack" : "iconGrid";
        if (action.id === "removeSelectedGeneratedComponent") {
          this.generated = null;
          if (this.context === "component") this.context = "text";
        }
        if (action.id === "addItem") this.items.push({ key: payload.key, matchName: payload.matchName });
        if (action.id === "createStrokeFillLayer") {
          this.context = "shapes";
          this.items = [{ key: "strokeFill", matchName: "Stroke + Fill Layer" }];
        }
        if (field2.refreshStateAfterRun ?? action.refreshStateAfterRun) this.refreshCount++;
        if (action.id === "refresh") this.refreshCount++;
      }
      return this.lastResult = { ok, preview: true, action: action.id, payload, hostFunction: action.hostFunction };
    }
    snapshot() {
      return clone({ values: this.values, context: this.context, generated: this.generated, refreshCount: this.refreshCount, items: this.items, lastResult: this.lastResult });
    }
  };

  // client/reference/src/geometry.js
  function viewportRect(element) {
    const rect = element.getBoundingClientRect(), root2 = document.querySelector("#reference-root");
    const factor = root2?.contains(element) ? innerWidth / root2.getBoundingClientRect().width : 1;
    const result = {};
    for (const key of ["x", "y", "left", "top", "right", "bottom", "width", "height"]) result[key] = rect[key] * (factor || 1);
    return result;
  }
  function viewportScale(element) {
    return viewportRect(element).width / (element.offsetWidth || element.clientWidth || 1);
  }

  // client/reference/src/production-data.js
  var DATA = { "appearance": [{ "id": "base.accent", "category": "base", "tier": "basic", "controlType": "color", "labelKey": "appearance.base.accent.label", "descriptionKey": "appearance.base.accent.description", "defaultSource": "settings.themeAccent", "classification": "BASE_INPUT", "persistence": "settings", "userAdjustable": true, "resolverTarget": "base.accent", "validation": { "type": "hex-color" }, "livePreview": true, "reset": "settings-default" }, { "id": "base.canvas", "category": "base", "tier": "basic", "controlType": "color", "labelKey": "appearance.base.canvas.label", "descriptionKey": "appearance.base.canvas.description", "defaultSource": "settings.homeBackground", "classification": "BASE_INPUT", "persistence": "settings", "userAdjustable": true, "resolverTarget": "base.canvas", "validation": { "type": "hex-color" }, "livePreview": true, "reset": "settings-default" }, { "id": "layout.scale", "category": "layout", "tier": "basic", "controlType": "range", "labelKey": "appearance.layout.scale.label", "descriptionKey": "appearance.layout.scale.description", "defaultSource": "settings.uiScale", "classification": "BASE_INPUT", "persistence": "settings", "userAdjustable": true, "resolverTarget": "layout.scale", "validation": { "type": "number", "min": 0.62, "max": 1.18 }, "livePreview": true, "reset": "settings-default" }, { "id": "motion.speed", "category": "motion", "tier": "basic", "controlType": "range", "labelKey": "appearance.motion.speed.label", "descriptionKey": "appearance.motion.speed.description", "defaultSource": "settings.motionSpeed", "classification": "BASE_INPUT", "persistence": "settings", "userAdjustable": true, "resolverTarget": "motion.speed", "validation": { "type": "number", "min": 0.75, "max": 1.35 }, "livePreview": true, "reset": "settings-default" }, { "id": "surface.panel", "category": "surfaces", "tier": "advanced", "controlType": "color", "labelKey": "appearance.surface.panel.label", "descriptionKey": "appearance.surface.panel.description", "defaultSource": "design", "classification": "EXPOSE_NOW", "persistence": "appearance", "userAdjustable": true, "resolverTarget": "surface.panel", "validation": { "type": "hex-color" }, "livePreview": true, "reset": "remove-override" }, { "id": "text.primary", "category": "text", "tier": "advanced", "controlType": "color", "labelKey": "appearance.text.primary.label", "descriptionKey": "appearance.text.primary.description", "defaultSource": "design", "classification": "EXPOSE_NOW", "persistence": "appearance", "userAdjustable": true, "resolverTarget": "text.primary", "validation": { "type": "hex-color" }, "livePreview": true, "reset": "remove-override" }, { "id": "text.secondary", "category": "text", "tier": "advanced", "controlType": "colorAlpha", "labelKey": "appearance.text.secondary.label", "descriptionKey": "appearance.text.secondary.description", "defaultSource": "design", "classification": "EXPOSE_NOW", "persistence": "appearance", "userAdjustable": true, "resolverTarget": "text.secondary", "validation": { "type": "colorAlpha" }, "livePreview": true, "reset": "remove-override" }, { "id": "text.tertiary", "category": "text", "tier": "advanced", "controlType": "colorAlpha", "labelKey": "appearance.text.tertiary.label", "descriptionKey": "appearance.text.tertiary.description", "defaultSource": "design", "classification": "EXPOSE_NOW", "persistence": "appearance", "userAdjustable": true, "resolverTarget": "text.tertiary", "validation": { "type": "colorAlpha" }, "livePreview": true, "reset": "remove-override" }, { "id": "select.trigger.surface", "category": "select", "tier": "advanced", "controlType": "color", "labelKey": "appearance.select.triggerSurface.label", "descriptionKey": "appearance.select.triggerSurface.description", "defaultSource": "design", "classification": "EXPOSE_NOW", "persistence": "appearance", "userAdjustable": true, "resolverTarget": "select.trigger.surface", "validation": { "type": "hex-color" }, "livePreview": true, "reset": "remove-override" }, { "id": "select.menu.surface", "category": "select", "tier": "advanced", "controlType": "color", "labelKey": "appearance.select.menuSurface.label", "descriptionKey": "appearance.select.menuSurface.description", "defaultSource": "design", "classification": "EXPOSE_NOW", "persistence": "appearance", "userAdjustable": true, "resolverTarget": "select.menu.surface", "validation": { "type": "hex-color" }, "livePreview": true, "reset": "remove-override" }, { "id": "typography.title.size", "category": "typography", "subgroup": "titles", "tier": "advanced", "controlType": "range-number", "labelKey": "appearance.typography.titleSize.label", "descriptionKey": "appearance.typography.titleSize.description", "defaultSource": "design", "classification": "EXPOSE_NOW", "persistence": "appearance", "userAdjustable": true, "resolverTarget": "typography.title.sizeMultiplier", "validation": { "type": "multiplier", "min": 0.9, "max": 1.15, "step": 0.01 }, "livePreview": true, "reset": "remove-override" }, { "id": "typography.sectionTitle.size", "category": "typography", "subgroup": "titles", "tier": "advanced", "controlType": "range-number", "labelKey": "appearance.typography.sectionTitleSize.label", "descriptionKey": "appearance.typography.sectionTitleSize.description", "defaultSource": "design", "classification": "EXPOSE_NOW", "persistence": "appearance", "userAdjustable": true, "resolverTarget": "typography.sectionTitle.sizeMultiplier", "validation": { "type": "multiplier", "min": 0.9, "max": 1.15, "step": 0.01 }, "livePreview": true, "reset": "remove-override" }, { "id": "typography.fieldLabel.size", "category": "typography", "subgroup": "content", "tier": "advanced", "controlType": "range-number", "labelKey": "appearance.typography.fieldLabelSize.label", "descriptionKey": "appearance.typography.fieldLabelSize.description", "defaultSource": "design", "classification": "EXPOSE_NOW", "persistence": "appearance", "userAdjustable": true, "resolverTarget": "typography.fieldLabel.sizeMultiplier", "validation": { "type": "multiplier", "min": 0.9, "max": 1.2, "step": 0.01 }, "livePreview": true, "reset": "remove-override" }, { "id": "typography.body.size", "category": "typography", "subgroup": "content", "tier": "advanced", "controlType": "range-number", "labelKey": "appearance.typography.bodySize.label", "descriptionKey": "appearance.typography.bodySize.description", "defaultSource": "design", "classification": "EXPOSE_NOW", "persistence": "appearance", "userAdjustable": true, "resolverTarget": "typography.body.sizeMultiplier", "validation": { "type": "multiplier", "min": 0.95, "max": 1.15, "step": 0.01 }, "livePreview": true, "reset": "remove-override" }, { "id": "typography.supporting.size", "category": "typography", "subgroup": "content", "tier": "advanced", "controlType": "range-number", "labelKey": "appearance.typography.supportingSize.label", "descriptionKey": "appearance.typography.supportingSize.description", "defaultSource": "design", "classification": "EXPOSE_NOW", "persistence": "appearance", "userAdjustable": true, "resolverTarget": "typography.supporting.sizeMultiplier", "validation": { "type": "multiplier", "min": 0.9, "max": 1.2, "step": 0.01 }, "livePreview": true, "reset": "remove-override" }, { "id": "typography.code.size", "category": "typography", "subgroup": "code", "tier": "advanced", "controlType": "range-number", "labelKey": "appearance.typography.codeSize.label", "descriptionKey": "appearance.typography.codeSize.description", "defaultSource": "design", "classification": "EXPOSE_NOW", "persistence": "appearance", "userAdjustable": true, "resolverTarget": "typography.code.sizeMultiplier", "validation": { "type": "multiplier", "min": 0.9, "max": 1.15, "step": 0.01 }, "livePreview": true, "reset": "remove-override" }, { "id": "interaction.focus.ring", "category": "interaction", "tier": "advanced-later", "controlType": "color", "labelKey": "appearance.interaction.focusRing.label", "descriptionKey": "appearance.interaction.focusRing.description", "defaultSource": "theme-derived", "classification": "ADVANCED_LATER", "persistence": "appearance", "userAdjustable": true, "resolverTarget": "interaction.focus.ring", "validation": { "type": "hex-color" }, "livePreview": true, "reset": "remove-override" }, { "id": "interaction.focus.border", "category": "interaction", "tier": "advanced-later", "controlType": "color", "labelKey": "appearance.interaction.focusBorder.label", "descriptionKey": "appearance.interaction.focusBorder.description", "defaultSource": "theme-derived", "classification": "ADVANCED_LATER", "persistence": "appearance", "userAdjustable": true, "resolverTarget": "interaction.focus.border", "validation": { "type": "hex-color" }, "livePreview": true, "reset": "remove-override" }, { "id": "interaction.hover.border", "category": "interaction", "tier": "advanced-later", "controlType": "color", "labelKey": "appearance.interaction.hoverBorder.label", "descriptionKey": "appearance.interaction.hoverBorder.description", "defaultSource": "theme-derived", "classification": "ADVANCED_LATER", "persistence": "appearance", "userAdjustable": true, "resolverTarget": "interaction.hover.border", "validation": { "type": "hex-color" }, "livePreview": true, "reset": "remove-override" }, { "id": "interaction.hover.surface", "category": "interaction", "tier": "advanced-later", "controlType": "color", "labelKey": "appearance.interaction.hoverSurface.label", "descriptionKey": "appearance.interaction.hoverSurface.description", "defaultSource": "theme-derived", "classification": "ADVANCED_LATER", "persistence": "appearance", "userAdjustable": true, "resolverTarget": "interaction.hover.surface", "validation": { "type": "hex-color" }, "livePreview": true, "reset": "remove-override" }, { "id": "interaction.selected.surface", "category": "interaction", "tier": "advanced-later", "controlType": "color", "labelKey": "appearance.interaction.selectedSurface.label", "descriptionKey": "appearance.interaction.selectedSurface.description", "defaultSource": "theme-derived", "classification": "ADVANCED_LATER", "persistence": "appearance", "userAdjustable": true, "resolverTarget": "interaction.selected.surface", "validation": { "type": "hex-color" }, "livePreview": true, "reset": "remove-override" }, { "id": "interaction.selected.foreground", "category": "interaction", "tier": "advanced-later", "controlType": "color", "labelKey": "appearance.interaction.selectedForeground.label", "descriptionKey": "appearance.interaction.selectedForeground.description", "defaultSource": "theme-derived", "classification": "ADVANCED_LATER", "persistence": "appearance", "userAdjustable": true, "resolverTarget": "interaction.selected.foreground", "validation": { "type": "hex-color" }, "livePreview": true, "reset": "remove-override" }, { "id": "interaction.checked.surface", "category": "interaction", "tier": "advanced-later", "controlType": "color", "labelKey": "appearance.interaction.checkedSurface.label", "descriptionKey": "appearance.interaction.checkedSurface.description", "defaultSource": "theme-derived", "classification": "ADVANCED_LATER", "persistence": "appearance", "userAdjustable": true, "resolverTarget": "interaction.checked.surface", "validation": { "type": "hex-color" }, "livePreview": true, "reset": "remove-override" }, { "id": "action.primary.surface", "category": "actions", "tier": "advanced-later", "controlType": "color", "labelKey": "appearance.action.primarySurface.label", "descriptionKey": "appearance.action.primarySurface.description", "defaultSource": "theme-derived", "classification": "ADVANCED_LATER", "persistence": "appearance", "userAdjustable": true, "resolverTarget": "action.primary.surface", "validation": { "type": "hex-color" }, "livePreview": true, "reset": "remove-override" }, { "id": "action.primary.hoverSurface", "category": "actions", "tier": "advanced-later", "controlType": "color", "labelKey": "appearance.action.primaryHoverSurface.label", "descriptionKey": "appearance.action.primaryHoverSurface.description", "defaultSource": "theme-derived", "classification": "ADVANCED_LATER", "persistence": "appearance", "userAdjustable": true, "resolverTarget": "action.primary.hoverSurface", "validation": { "type": "hex-color" }, "livePreview": true, "reset": "remove-override" }, { "id": "action.primary.foreground", "category": "actions", "tier": "internal", "controlType": "color", "labelKey": "appearance.action.primaryForeground.label", "descriptionKey": "appearance.action.primaryForeground.description", "defaultSource": "design", "classification": "INTERNAL", "persistence": "none", "userAdjustable": false, "resolverTarget": "action.primary.foreground", "validation": { "type": "hex-color" }, "livePreview": false, "reset": "none" }, { "id": "selection.indicator.surface", "category": "interaction", "tier": "advanced-later", "controlType": "color", "labelKey": "appearance.selection.indicatorSurface.label", "descriptionKey": "appearance.selection.indicatorSurface.description", "defaultSource": "theme-derived", "classification": "ADVANCED_LATER", "persistence": "appearance", "userAdjustable": true, "resolverTarget": "selection.indicator.surface", "validation": { "type": "hex-color" }, "livePreview": true, "reset": "remove-override" }], "tuning": [{ "id": "motion.curve.enter", "type": "cubicBezier", "domain": "motion", "family": "enter", "cssProperty": "--motion-curve-enter", "consumerScope": "global-common", "previewGroup": "motion", "previewTargets": ["settings", "registry", "controlLab"], "calibrationChromeIsolation": false, "canonicalSource": "computed-style", "projection": "root-semantic-property", "resetScope": "motion", "disposition": "EDITABLE", "reason": "" }, { "id": "motion.curve.exit", "type": "cubicBezier", "domain": "motion", "family": "exit", "cssProperty": "--motion-curve-exit", "consumerScope": "global-common", "previewGroup": "motion", "previewTargets": ["settings", "registry", "controlLab"], "calibrationChromeIsolation": false, "canonicalSource": "computed-style", "projection": "root-semantic-property", "resetScope": "motion", "disposition": "EDITABLE", "reason": "" }, { "id": "motion.curve.standard", "type": "cubicBezier", "domain": "motion", "family": "standard", "cssProperty": "--motion-curve-standard", "consumerScope": "global-common", "previewGroup": "motion", "previewTargets": ["settings", "registry", "controlLab"], "calibrationChromeIsolation": false, "canonicalSource": "computed-style", "projection": "root-semantic-property", "resetScope": "motion", "disposition": "EDITABLE", "reason": "" }, { "id": "motion.curve.press", "type": "cubicBezier", "domain": "motion", "family": "press", "cssProperty": "--motion-curve-press", "consumerScope": "global-common", "previewGroup": "motion", "previewTargets": ["settings", "registry", "controlLab"], "calibrationChromeIsolation": false, "canonicalSource": "computed-style", "projection": "root-semantic-property", "resetScope": "motion", "disposition": "EDITABLE", "reason": "" }, { "id": "motion.duration.spatialExpand", "type": "durationMs", "domain": "motion", "motionRole": "spatialMorphExpand", "validity": { "min": 40, "max": 1200 }, "editing": { "trackMin": 40, "trackMax": 1200, "step": 10, "unit": "ms" }, "consumerScope": "global-common", "previewGroup": "motion", "previewTargets": ["settings", "registry", "controlLab"], "calibrationChromeIsolation": false, "canonicalSource": "motion-defaults", "projection": "motion-resolver", "resetScope": "motion", "disposition": "EDITABLE", "reason": "" }, { "id": "motion.duration.spatialContract", "type": "durationMs", "domain": "motion", "motionRole": "spatialMorphContract", "validity": { "min": 40, "max": 1200 }, "editing": { "trackMin": 40, "trackMax": 1200, "step": 10, "unit": "ms" }, "consumerScope": "global-common", "previewGroup": "motion", "previewTargets": ["settings", "registry", "controlLab"], "calibrationChromeIsolation": false, "canonicalSource": "motion-defaults", "projection": "motion-resolver", "resetScope": "motion", "disposition": "EDITABLE", "reason": "" }, { "id": "motion.duration.viewContentEnter", "type": "durationMs", "domain": "motion", "motionRole": "viewContentEnter", "validity": { "min": 40, "max": 1200 }, "editing": { "trackMin": 40, "trackMax": 1200, "step": 10, "unit": "ms" }, "consumerScope": "global-common", "previewGroup": "motion", "previewTargets": ["settings", "registry", "controlLab"], "calibrationChromeIsolation": false, "canonicalSource": "motion-defaults", "projection": "motion-resolver", "resetScope": "motion", "disposition": "EDITABLE", "reason": "" }, { "id": "motion.duration.viewContentExit", "type": "durationMs", "domain": "motion", "motionRole": "viewContentExit", "validity": { "min": 40, "max": 1200 }, "editing": { "trackMin": 40, "trackMax": 1200, "step": 10, "unit": "ms" }, "consumerScope": "global-common", "previewGroup": "motion", "previewTargets": ["settings", "registry", "controlLab"], "calibrationChromeIsolation": false, "canonicalSource": "motion-defaults", "projection": "motion-resolver", "resetScope": "motion", "disposition": "EDITABLE", "reason": "" }, { "id": "motion.duration.actionFeedback", "type": "durationMs", "domain": "motion", "motionRole": "actionFeedback", "validity": { "min": 40, "max": 1200 }, "editing": { "trackMin": 40, "trackMax": 1200, "step": 10, "unit": "ms" }, "consumerScope": "global-common", "previewGroup": "motion", "previewTargets": ["settings", "registry", "controlLab"], "calibrationChromeIsolation": false, "canonicalSource": "motion-defaults", "projection": "motion-resolver", "resetScope": "motion", "disposition": "EDITABLE", "reason": "" }, { "id": "motion.duration.actionPress", "type": "durationMs", "domain": "motion", "motionRole": "actionPress", "validity": { "min": 40, "max": 1200 }, "editing": { "trackMin": 40, "trackMax": 1200, "step": 10, "unit": "ms" }, "consumerScope": "global-common", "previewGroup": "motion", "previewTargets": ["settings", "registry", "controlLab"], "calibrationChromeIsolation": false, "canonicalSource": "motion-defaults", "projection": "motion-resolver", "resetScope": "motion", "disposition": "EDITABLE", "reason": "" }, { "id": "motion.duration.surfaceState", "type": "durationMs", "domain": "motion", "motionRole": "surfaceState", "validity": { "min": 40, "max": 1200 }, "editing": { "trackMin": 40, "trackMax": 1200, "step": 10, "unit": "ms" }, "consumerScope": "global-common", "previewGroup": "motion", "previewTargets": ["settings", "registry", "controlLab"], "calibrationChromeIsolation": false, "canonicalSource": "motion-defaults", "projection": "motion-resolver", "resetScope": "motion", "disposition": "EDITABLE", "reason": "" }, { "id": "motion.duration.structuralCollapse", "type": "durationMs", "domain": "motion", "motionRole": "structuralCollapse", "validity": { "min": 40, "max": 1200 }, "editing": { "trackMin": 40, "trackMax": 1200, "step": 10, "unit": "ms" }, "consumerScope": "global-common", "previewGroup": "motion", "previewTargets": ["settings", "registry", "controlLab"], "calibrationChromeIsolation": false, "canonicalSource": "motion-defaults", "projection": "motion-resolver", "resetScope": "motion", "disposition": "EDITABLE", "reason": "" }, { "id": "motion.duration.homeHandoffRecede", "type": "durationMs", "domain": "motion", "motionRole": "homeHandoffRecede", "validity": { "min": 40, "max": 1200 }, "editing": { "trackMin": 40, "trackMax": 1200, "step": 10, "unit": "ms" }, "consumerScope": "global-common", "previewGroup": "motion", "previewTargets": ["settings", "registry", "controlLab"], "calibrationChromeIsolation": false, "canonicalSource": "motion-defaults", "projection": "motion-resolver", "resetScope": "motion", "disposition": "EDITABLE", "reason": "" }, { "id": "motion.duration.homeHandoffRestore", "type": "durationMs", "domain": "motion", "motionRole": "homeHandoffRestore", "validity": { "min": 40, "max": 1200 }, "editing": { "trackMin": 40, "trackMax": 1200, "step": 10, "unit": "ms" }, "consumerScope": "global-common", "previewGroup": "motion", "previewTargets": ["settings", "registry", "controlLab"], "calibrationChromeIsolation": false, "canonicalSource": "motion-defaults", "projection": "motion-resolver", "resetScope": "motion", "disposition": "EDITABLE", "reason": "" }, { "id": "motion.duration.spatialIdentity", "type": "durationMs", "domain": "motion", "motionRole": "spatialMorphIdentity", "validity": { "min": 40, "max": 1200 }, "editing": { "trackMin": 40, "trackMax": 1200, "step": 10, "unit": "ms" }, "consumerScope": "global-common", "previewGroup": "motion", "previewTargets": ["settings", "registry", "controlLab"], "calibrationChromeIsolation": false, "canonicalSource": "motion-defaults", "projection": "motion-resolver", "resetScope": "motion", "disposition": "EDITABLE", "reason": "" }, { "id": "motion.duration.toolIdentityOpen", "type": "durationMs", "domain": "motion", "motionRole": "toolIdentityOpen", "validity": { "min": 40, "max": 1200 }, "editing": { "trackMin": 40, "trackMax": 1200, "step": 10, "unit": "ms" }, "consumerScope": "global-common", "previewGroup": "motion", "previewTargets": ["settings", "registry", "controlLab"], "calibrationChromeIsolation": false, "canonicalSource": "motion-defaults", "projection": "motion-resolver", "resetScope": "motion", "disposition": "EDITABLE", "reason": "" }, { "id": "motion.duration.paletteEnter", "type": "durationMs", "domain": "motion", "motionRole": "paletteEnter", "validity": { "min": 40, "max": 1200 }, "editing": { "trackMin": 40, "trackMax": 1200, "step": 10, "unit": "ms" }, "consumerScope": "global-common", "previewGroup": "motion", "previewTargets": ["settings", "registry", "controlLab"], "calibrationChromeIsolation": false, "canonicalSource": "motion-defaults", "projection": "motion-resolver", "resetScope": "motion", "disposition": "EDITABLE", "reason": "" }, { "id": "motion.duration.paletteExit", "type": "durationMs", "domain": "motion", "motionRole": "paletteExit", "validity": { "min": 40, "max": 1200 }, "editing": { "trackMin": 40, "trackMax": 1200, "step": 10, "unit": "ms" }, "consumerScope": "global-common", "previewGroup": "motion", "previewTargets": ["settings", "registry", "controlLab"], "calibrationChromeIsolation": false, "canonicalSource": "motion-defaults", "projection": "motion-resolver", "resetScope": "motion", "disposition": "EDITABLE", "reason": "" }, { "id": "motion.duration.dragSettle", "type": "durationMs", "domain": "motion", "motionRole": "dragSettle", "validity": { "min": 40, "max": 1200 }, "editing": { "trackMin": 40, "trackMax": 1200, "step": 10, "unit": "ms" }, "consumerScope": "global-common", "previewGroup": "motion", "previewTargets": ["settings", "registry", "controlLab"], "calibrationChromeIsolation": false, "canonicalSource": "motion-defaults", "projection": "motion-resolver", "resetScope": "motion", "disposition": "EDITABLE", "reason": "" }, { "id": "spacing.surface.edge", "type": "lengthPx", "domain": "spacing", "group": "surface", "cssProperty": "--space-surface-edge", "validity": { "min": 0 }, "editing": { "trackMin": 8, "trackMax": 36, "step": 1, "unit": "px" }, "consumerScope": "global-common", "previewGroup": "controls", "previewTargets": ["settings", "registry", "controlLab"], "calibrationChromeIsolation": false, "canonicalSource": "computed-style", "projection": "root-semantic-property", "resetScope": "spacing", "disposition": "EDITABLE", "reason": "" }, { "id": "spacing.card.inset", "type": "lengthPx", "domain": "spacing", "group": "surface", "cssProperty": "--space-card-inset", "validity": { "min": 0 }, "editing": { "trackMin": 4, "trackMax": 28, "step": 1, "unit": "px" }, "consumerScope": "global-common", "previewGroup": "controls", "previewTargets": ["settings", "registry", "controlLab"], "calibrationChromeIsolation": false, "canonicalSource": "computed-style", "projection": "root-semantic-property", "resetScope": "spacing", "disposition": "EDITABLE", "reason": "" }, { "id": "spacing.content.inlineInset", "type": "lengthPx", "domain": "spacing", "group": "content", "cssProperty": "--space-content-inline-inset", "validity": { "min": 0 }, "editing": { "trackMin": 2, "trackMax": 20, "step": 1, "unit": "px" }, "consumerScope": "global-common", "previewGroup": "controls", "previewTargets": ["settings", "registry", "controlLab"], "calibrationChromeIsolation": false, "canonicalSource": "computed-style", "projection": "root-semantic-property", "resetScope": "spacing", "disposition": "EDITABLE", "reason": "" }, { "id": "spacing.content.blockInset", "type": "lengthPx", "domain": "spacing", "group": "content", "cssProperty": "--space-content-block-inset", "validity": { "min": 0 }, "editing": { "trackMin": 2, "trackMax": 20, "step": 1, "unit": "px" }, "presentation": { "labelKey": "settings.designTuning.parameter.spacing.content.blockInset", "descriptionKey": "settings.designTuning.parameter.spacing.content.blockInset.description" }, "consumerScope": "global-common", "previewGroup": "controls", "previewTargets": ["settings", "registry", "controlLab"], "calibrationChromeIsolation": false, "canonicalSource": "computed-style", "projection": "root-semantic-property", "resetScope": "spacing", "disposition": "EDITABLE", "reason": "" }, { "id": "spacing.section.stack", "type": "lengthPx", "domain": "spacing", "group": "section", "cssProperty": "--space-section-stack", "validity": { "min": 0 }, "editing": { "trackMin": 4, "trackMax": 28, "step": 1, "unit": "px" }, "consumerScope": "global-common", "previewGroup": "controls", "previewTargets": ["settings", "registry", "controlLab"], "calibrationChromeIsolation": false, "canonicalSource": "computed-style", "projection": "root-semantic-property", "resetScope": "spacing", "disposition": "EDITABLE", "reason": "" }, { "id": "spacing.section.headerContent", "type": "lengthPx", "domain": "spacing", "group": "section", "cssProperty": "--space-section-header-content", "validity": { "min": 0 }, "editing": { "trackMin": 2, "trackMax": 24, "step": 1, "unit": "px" }, "consumerScope": "global-common", "previewGroup": "controls", "previewTargets": ["settings", "registry", "controlLab"], "calibrationChromeIsolation": false, "canonicalSource": "computed-style", "projection": "root-semantic-property", "resetScope": "spacing", "disposition": "EDITABLE", "reason": "" }, { "id": "spacing.field.copy", "type": "lengthPx", "domain": "spacing", "group": "field", "cssProperty": "--space-field-copy", "validity": { "min": 0 }, "editing": { "trackMin": 0, "trackMax": 12, "step": 1, "unit": "px" }, "consumerScope": "global-common", "previewGroup": "controls", "previewTargets": ["settings", "registry", "controlLab"], "calibrationChromeIsolation": true, "canonicalSource": "computed-style", "projection": "root-semantic-property", "resetScope": "spacing", "disposition": "EDITABLE", "reason": "" }, { "id": "spacing.field.block", "type": "lengthPx", "domain": "spacing", "group": "field", "cssProperty": "--space-field-block", "validity": { "min": 0 }, "editing": { "trackMin": 0, "trackMax": 20, "step": 1, "unit": "px" }, "consumerScope": "global-common", "previewGroup": "controls", "previewTargets": ["settings", "registry", "controlLab"], "calibrationChromeIsolation": true, "canonicalSource": "computed-style", "projection": "root-semantic-property", "resetScope": "spacing", "disposition": "EDITABLE", "reason": "" }, { "id": "spacing.control.inline", "type": "lengthPx", "domain": "spacing", "group": "control", "cssProperty": "--space-inline-control", "validity": { "min": 0 }, "editing": { "trackMin": 2, "trackMax": 20, "step": 1, "unit": "px" }, "consumerScope": "global-common", "previewGroup": "controls", "previewTargets": ["settings", "registry", "controlLab"], "calibrationChromeIsolation": true, "canonicalSource": "computed-style", "projection": "root-semantic-property", "resetScope": "spacing", "disposition": "EDITABLE", "reason": "" }, { "id": "spacing.settings.fieldControl", "type": "lengthPx", "domain": "spacing", "group": "settings", "cssProperty": "--space-settings-field-control", "validity": { "min": 0 }, "editing": { "trackMin": 4, "trackMax": 28, "step": 1, "unit": "px" }, "consumerScope": "domain-specific", "previewGroup": "settings", "previewTargets": ["settings"], "calibrationChromeIsolation": true, "canonicalSource": "computed-style", "projection": "root-semantic-property", "resetScope": "spacing", "disposition": "EDITABLE", "reason": "" }, { "id": "spacing.registry.cardInset", "type": "lengthPx", "domain": "spacing", "group": "registry", "cssProperty": "--space-registry-card-inset", "validity": { "min": 0 }, "editing": { "trackMin": 4, "trackMax": 30, "step": 1, "unit": "px" }, "consumerScope": "domain-specific", "previewGroup": "controls", "previewTargets": ["registry"], "calibrationChromeIsolation": false, "canonicalSource": "computed-style", "projection": "root-semantic-property", "resetScope": "spacing", "disposition": "EDITABLE", "reason": "" }, { "id": "spacing.registry.introContent", "type": "lengthPx", "domain": "spacing", "group": "registry", "cssProperty": "--space-registry-intro-content", "validity": { "min": 0 }, "editing": { "trackMin": 4, "trackMax": 30, "step": 1, "unit": "px" }, "consumerScope": "domain-specific", "previewGroup": "controls", "previewTargets": ["registry"], "calibrationChromeIsolation": false, "canonicalSource": "computed-style", "projection": "root-semantic-property", "resetScope": "spacing", "disposition": "EDITABLE", "reason": "" }, { "id": "spacing.registry.sectionHeaderContent", "type": "lengthPx", "domain": "spacing", "group": "registry", "cssProperty": "--space-registry-section-header-content", "validity": { "min": 0 }, "editing": { "trackMin": 4, "trackMax": 30, "step": 1, "unit": "px" }, "consumerScope": "domain-specific", "previewGroup": "controls", "previewTargets": ["registry"], "calibrationChromeIsolation": false, "canonicalSource": "computed-style", "projection": "root-semantic-property", "resetScope": "spacing", "disposition": "EDITABLE", "reason": "" }, { "id": "spacing.registry.sectionCopy", "type": "lengthPx", "domain": "spacing", "group": "registry", "cssProperty": "--space-registry-section-copy", "validity": { "min": 0 }, "editing": { "trackMin": 0, "trackMax": 16, "step": 1, "unit": "px" }, "consumerScope": "domain-specific", "previewGroup": "controls", "previewTargets": ["registry"], "calibrationChromeIsolation": false, "canonicalSource": "computed-style", "projection": "root-semantic-property", "resetScope": "spacing", "disposition": "EDITABLE", "reason": "" }, { "id": "spacing.registry.fieldCopy", "type": "lengthPx", "domain": "spacing", "group": "registry", "cssProperty": "--space-registry-field-copy", "validity": { "min": 0 }, "editing": { "trackMin": 0, "trackMax": 16, "step": 1, "unit": "px" }, "consumerScope": "domain-specific", "previewGroup": "controls", "previewTargets": ["registry"], "calibrationChromeIsolation": false, "canonicalSource": "computed-style", "projection": "root-semantic-property", "resetScope": "spacing", "disposition": "EDITABLE", "reason": "" }, { "id": "spacing.registry.fieldControl", "type": "lengthPx", "domain": "spacing", "group": "registry", "cssProperty": "--space-registry-field-control", "validity": { "min": 0 }, "editing": { "trackMin": 4, "trackMax": 30, "step": 1, "unit": "px" }, "consumerScope": "domain-specific", "previewGroup": "controls", "previewTargets": ["registry"], "calibrationChromeIsolation": false, "canonicalSource": "computed-style", "projection": "root-semantic-property", "resetScope": "spacing", "disposition": "EDITABLE", "reason": "" }, { "id": "spacing.palette.fieldControl", "type": "lengthPx", "domain": "spacing", "group": "palette", "cssProperty": "--space-palette-field-control", "validity": { "min": 0 }, "editing": { "trackMin": 2, "trackMax": 24, "step": 1, "unit": "px" }, "consumerScope": "domain-specific", "previewGroup": "palette", "previewTargets": ["palette"], "calibrationChromeIsolation": false, "canonicalSource": "computed-style", "projection": "root-semantic-property", "resetScope": "spacing", "disposition": "EDITABLE", "reason": "" }, { "id": "spacing.home.toolGrid", "type": "lengthPx", "domain": "spacing", "group": "home", "cssProperty": "--space-home-tool-grid", "validity": { "min": 0 }, "editing": { "trackMin": 6, "trackMax": 32, "step": 1, "unit": "px" }, "consumerScope": "domain-specific", "previewGroup": "home", "previewTargets": ["home"], "calibrationChromeIsolation": false, "canonicalSource": "computed-style", "projection": "root-semantic-property", "resetScope": "spacing", "disposition": "EDITABLE", "reason": "" }, { "id": "spacing.home.majorStack", "type": "lengthPx", "domain": "spacing", "group": "home", "cssProperty": "--space-home-major-stack", "validity": { "min": 0 }, "editing": { "trackMin": 6, "trackMax": 32, "step": 1, "unit": "px" }, "consumerScope": "domain-specific", "previewGroup": "home", "previewTargets": ["home"], "calibrationChromeIsolation": false, "canonicalSource": "computed-style", "projection": "root-semantic-property", "resetScope": "spacing", "disposition": "EDITABLE", "reason": "" }, { "id": "spacing.home.cardTitle", "type": "lengthPx", "domain": "spacing", "group": "home", "cssProperty": "--space-home-card-title", "validity": { "min": 0 }, "editing": { "trackMin": 2, "trackMax": 24, "step": 1, "unit": "px" }, "consumerScope": "domain-specific", "previewGroup": "home", "previewTargets": ["home"], "calibrationChromeIsolation": false, "canonicalSource": "computed-style", "projection": "root-semantic-property", "resetScope": "spacing", "disposition": "EDITABLE", "reason": "" }, { "id": "radius.primaryWorkSurface", "type": "lengthPx", "domain": "radius", "group": "surface", "cssProperty": "--radius-primary-work-surface", "validity": { "min": 0 }, "editing": { "trackMin": 0, "trackMax": 32, "step": 1, "unit": "px" }, "consumerScope": "global-common", "previewGroup": "controls", "previewTargets": ["settings", "registry", "controlLab"], "calibrationChromeIsolation": false, "canonicalSource": "computed-style", "projection": "root-semantic-property", "resetScope": "radius", "disposition": "EDITABLE", "reason": "" }, { "id": "radius.nestedSurface", "type": "lengthPx", "domain": "radius", "group": "surface", "cssProperty": "--radius-nested-surface", "validity": { "min": 0 }, "editing": { "trackMin": 4, "trackMax": 28, "step": 1, "unit": "px" }, "consumerScope": "global-common", "previewGroup": "surfaces", "previewTargets": ["settings", "registry", "controlLab"], "calibrationChromeIsolation": false, "canonicalSource": "computed-style", "projection": "root-semantic-property", "resetScope": "radius", "disposition": "EDITABLE", "reason": "" }, { "id": "radius.editableControl", "type": "lengthPx", "domain": "radius", "group": "control", "cssProperty": "--radius-editable-control", "validity": { "min": 0 }, "editing": { "trackMin": 2, "trackMax": 20, "step": 1, "unit": "px" }, "consumerScope": "global-common", "previewGroup": "controls", "previewTargets": ["settings", "registry", "controlLab"], "calibrationChromeIsolation": true, "canonicalSource": "computed-style", "projection": "root-semantic-property", "resetScope": "radius", "disposition": "EDITABLE", "reason": "" }, { "id": "radius.sectionCard", "type": "lengthPx", "domain": "radius", "group": "identity", "cssProperty": "--radius-section-card", "protection": "surface-transition", "consumerScope": "global-common", "previewGroup": "controls", "previewTargets": ["settings", "registry", "controlLab"], "calibrationChromeIsolation": false, "canonicalSource": "computed-style", "projection": "read-only", "resetScope": "radius", "disposition": "PROTECTED", "reason": "Surface Transition identity handoff remains unresolved." }, { "id": "radius.homeTile", "type": "lengthPx", "domain": "radius", "group": "identity", "cssProperty": "--radius-home-tile", "protection": "surface-transition", "consumerScope": "global-common", "previewGroup": "controls", "previewTargets": ["settings", "registry", "controlLab"], "calibrationChromeIsolation": false, "canonicalSource": "computed-style", "projection": "read-only", "resetScope": "radius", "disposition": "PROTECTED", "reason": "Surface Transition identity handoff remains unresolved." }, { "id": "radius.homeIcon", "type": "percentage", "domain": "radius", "group": "identity", "cssProperty": "--radius-home-icon", "protection": "surface-transition", "consumerScope": "global-common", "previewGroup": "controls", "previewTargets": ["settings", "registry", "controlLab"], "calibrationChromeIsolation": false, "canonicalSource": "computed-style", "projection": "read-only", "resetScope": "radius", "disposition": "PROTECTED", "reason": "Surface Transition identity handoff remains unresolved." }, { "id": "geometry.control.height", "type": "lengthPx", "domain": "controls", "group": "field", "cssProperty": "--control-height", "validity": { "min": 0 }, "editing": { "trackMin": 22, "trackMax": 48, "step": 1, "unit": "px" }, "consumerScope": "global-common", "previewGroup": "controls", "previewTargets": ["settings", "registry", "controlLab"], "calibrationChromeIsolation": true, "canonicalSource": "computed-style", "projection": "root-semantic-property", "resetScope": "controls", "disposition": "EDITABLE", "reason": "" }, { "id": "geometry.button.height", "type": "lengthPx", "domain": "controls", "group": "button", "cssProperty": "--button-height", "validity": { "min": 0 }, "editing": { "trackMin": 28, "trackMax": 56, "step": 1, "unit": "px" }, "consumerScope": "global-common", "previewGroup": "controls", "previewTargets": ["settings", "registry", "controlLab"], "calibrationChromeIsolation": true, "canonicalSource": "computed-style", "projection": "root-semantic-property", "resetScope": "controls", "disposition": "EDITABLE", "reason": "" }, { "id": "geometry.button.horizontalPadding", "type": "lengthPx", "domain": "controls", "group": "button", "cssProperty": "--button-pad-x", "validity": { "min": 0 }, "editing": { "trackMin": 6, "trackMax": 28, "step": 1, "unit": "px" }, "consumerScope": "global-common", "previewGroup": "controls", "previewTargets": ["settings", "registry", "controlLab"], "calibrationChromeIsolation": true, "canonicalSource": "computed-style", "projection": "root-semantic-property", "resetScope": "controls", "disposition": "EDITABLE", "reason": "" }, { "id": "componentOptics.sliderThumbShadow", "type": "shadow", "domain": "controls", "group": "optics", "cssProperty": "--slider-thumb-optical-shadow", "presentation": { "labelKey": "settings.designTuning.parameter.componentOptics.sliderThumbShadow", "descriptionKey": "settings.designTuning.parameter.componentOptics.sliderThumbShadow.description" }, "consumerScope": "global-common", "previewGroup": "controls", "previewTargets": ["settings", "registry", "controlLab"], "calibrationChromeIsolation": false, "canonicalSource": "computed-style", "projection": "root-semantic-property", "resetScope": "controls", "disposition": "EDITABLE", "reason": "" }, { "id": "componentOptics.switchThumbShadow", "type": "shadow", "domain": "controls", "group": "optics", "cssProperty": "--switch-thumb-optical-shadow", "presentation": { "labelKey": "settings.designTuning.parameter.componentOptics.switchThumbShadow", "descriptionKey": "settings.designTuning.parameter.componentOptics.switchThumbShadow.description" }, "consumerScope": "global-common", "previewGroup": "controls", "previewTargets": ["settings", "registry", "controlLab"], "calibrationChromeIsolation": false, "canonicalSource": "computed-style", "projection": "root-semantic-property", "resetScope": "controls", "disposition": "EDITABLE", "reason": "" }, { "id": "elevation.surfaceShell", "type": "shadow", "domain": "elevation", "group": "surface", "cssProperty": "--elevation-surface-shell", "presentation": { "labelKey": "settings.designTuning.parameter.elevation.surfaceShell", "descriptionKey": "settings.designTuning.parameter.elevation.surfaceShell.description" }, "consumerScope": "global-common", "previewGroup": "surfaces", "previewTargets": ["settings", "registry", "controlLab"], "calibrationChromeIsolation": false, "canonicalSource": "computed-style", "projection": "root-semantic-property", "resetScope": "elevation", "disposition": "EDITABLE", "reason": "" }, { "id": "elevation.informationSurface", "type": "shadow", "domain": "elevation", "group": "surface", "cssProperty": "--elevation-information-surface", "presentation": { "labelKey": "settings.designTuning.parameter.elevation.informationSurface", "descriptionKey": "settings.designTuning.parameter.elevation.informationSurface.description" }, "consumerScope": "global-common", "previewGroup": "surfaces", "previewTargets": ["settings", "registry", "controlLab"], "calibrationChromeIsolation": false, "canonicalSource": "computed-style", "projection": "root-semantic-property", "resetScope": "elevation", "disposition": "EDITABLE", "reason": "" }, { "id": "elevation.primaryAction", "type": "shadow", "domain": "elevation", "group": "action", "cssProperty": "--elevation-primary-action", "presentation": { "labelKey": "settings.designTuning.parameter.elevation.primaryAction", "descriptionKey": "settings.designTuning.parameter.elevation.primaryAction.description" }, "consumerScope": "global-common", "previewGroup": "surfaces", "previewTargets": ["settings", "registry", "controlLab"], "calibrationChromeIsolation": false, "canonicalSource": "computed-style", "projection": "root-semantic-property", "resetScope": "elevation", "disposition": "EDITABLE", "reason": "" }, { "id": "elevation.utilityAction", "type": "shadow", "domain": "elevation", "group": "action", "cssProperty": "--elevation-utility-action", "presentation": { "labelKey": "settings.designTuning.parameter.elevation.utilityAction", "descriptionKey": "settings.designTuning.parameter.elevation.utilityAction.description" }, "consumerScope": "global-common", "previewGroup": "surfaces", "previewTargets": ["settings", "registry", "controlLab"], "calibrationChromeIsolation": false, "canonicalSource": "computed-style", "projection": "root-semantic-property", "resetScope": "elevation", "disposition": "EDITABLE", "reason": "" }, { "id": "elevation.floatingSurface", "type": "shadow", "domain": "elevation", "group": "floating", "cssProperty": "--elevation-floating-surface", "presentation": { "labelKey": "settings.designTuning.parameter.elevation.floatingSurface", "descriptionKey": "settings.designTuning.parameter.elevation.floatingSurface.description" }, "consumerScope": "global-common", "previewGroup": "surfaces", "previewTargets": ["settings", "registry", "controlLab"], "calibrationChromeIsolation": false, "canonicalSource": "computed-style", "projection": "root-semantic-property", "resetScope": "elevation", "disposition": "EDITABLE", "reason": "" }, { "id": "elevation.floatingPicker", "type": "shadow", "domain": "elevation", "group": "floating", "cssProperty": "--elevation-floating-picker", "presentation": { "labelKey": "settings.designTuning.parameter.elevation.floatingPicker", "descriptionKey": "settings.designTuning.parameter.elevation.floatingPicker.description" }, "consumerScope": "global-common", "previewGroup": "surfaces", "previewTargets": ["settings", "registry", "controlLab"], "calibrationChromeIsolation": false, "canonicalSource": "computed-style", "projection": "root-semantic-property", "resetScope": "elevation", "disposition": "EDITABLE", "reason": "" }, { "id": "elevation.actionContainer", "type": "shadow", "domain": "elevation", "group": "action", "cssProperty": "--elevation-action-container", "presentation": { "labelKey": "settings.designTuning.parameter.elevation.actionContainer", "descriptionKey": "settings.designTuning.parameter.elevation.actionContainer.description" }, "consumerScope": "global-common", "previewGroup": "surfaces", "previewTargets": ["settings", "registry", "controlLab"], "calibrationChromeIsolation": false, "canonicalSource": "computed-style", "projection": "root-semantic-property", "resetScope": "elevation", "disposition": "EDITABLE", "reason": "" }, { "id": "surface.field", "type": "colorAlpha", "domain": "surface", "group": "surface", "cssProperty": "--field-surface", "consumerScope": "global-common", "previewGroup": "controls", "previewTargets": ["settings", "registry", "controlLab"], "calibrationChromeIsolation": false, "canonicalSource": "computed-style", "projection": "root-semantic-property", "resetScope": "surface", "disposition": "EDITABLE", "reason": "" }, { "id": "surface.registryOption", "type": "colorAlpha", "domain": "surface", "group": "surface", "cssProperty": "--registry-option-surface", "consumerScope": "global-common", "previewGroup": "controls", "previewTargets": ["settings", "registry", "controlLab"], "calibrationChromeIsolation": false, "canonicalSource": "computed-style", "projection": "root-semantic-property", "resetScope": "surface", "disposition": "EDITABLE", "reason": "" }, { "id": "surface.conversation", "type": "colorAlpha", "domain": "surface", "group": "surface", "cssProperty": "--surface-conversation", "consumerScope": "global-common", "previewGroup": "controls", "previewTargets": ["settings", "registry", "controlLab"], "calibrationChromeIsolation": false, "canonicalSource": "computed-style", "projection": "root-semantic-property", "resetScope": "surface", "disposition": "EDITABLE", "reason": "" }, { "id": "surface.utilityChrome", "type": "colorAlpha", "domain": "surface", "group": "surface", "cssProperty": "--surface-utility-chrome", "consumerScope": "global-common", "previewGroup": "controls", "previewTargets": ["settings", "registry", "controlLab"], "calibrationChromeIsolation": false, "canonicalSource": "computed-style", "projection": "root-semantic-property", "resetScope": "surface", "disposition": "EDITABLE", "reason": "" }, { "id": "surface.utilityAction", "type": "colorAlpha", "domain": "surface", "group": "surface", "cssProperty": "--surface-utility-action", "consumerScope": "global-common", "previewGroup": "controls", "previewTargets": ["settings", "registry", "controlLab"], "calibrationChromeIsolation": false, "canonicalSource": "computed-style", "projection": "root-semantic-property", "resetScope": "surface", "disposition": "EDITABLE", "reason": "" }, { "id": "surface.neutralAction", "type": "colorAlpha", "domain": "surface", "group": "surface", "cssProperty": "--action-neutral-surface", "consumerScope": "global-common", "previewGroup": "controls", "previewTargets": ["settings", "registry", "controlLab"], "calibrationChromeIsolation": false, "canonicalSource": "computed-style", "projection": "root-semantic-property", "resetScope": "surface", "disposition": "EDITABLE", "reason": "" }, { "id": "surface.dangerAction", "type": "colorAlpha", "domain": "surface", "group": "surface", "cssProperty": "--danger-surface", "consumerScope": "global-common", "previewGroup": "controls", "previewTargets": ["settings", "registry", "controlLab"], "calibrationChromeIsolation": false, "canonicalSource": "computed-style", "projection": "root-semantic-property", "resetScope": "surface", "disposition": "EDITABLE", "reason": "" }, { "id": "border.separator", "type": "colorAlpha", "domain": "border", "group": "border", "cssProperty": "--separator", "consumerScope": "global-common", "previewGroup": "controls", "previewTargets": ["settings", "registry", "controlLab"], "calibrationChromeIsolation": false, "canonicalSource": "computed-style", "projection": "root-semantic-property", "resetScope": "border", "disposition": "EDITABLE", "reason": "" }, { "id": "border.panel", "type": "colorAlpha", "domain": "border", "group": "border", "cssProperty": "--panel-border", "consumerScope": "global-common", "previewGroup": "controls", "previewTargets": ["settings", "registry", "controlLab"], "calibrationChromeIsolation": false, "canonicalSource": "computed-style", "projection": "root-semantic-property", "resetScope": "border", "disposition": "EDITABLE", "reason": "" }, { "id": "border.input", "type": "colorAlpha", "domain": "border", "group": "border", "cssProperty": "--input-border", "consumerScope": "global-common", "previewGroup": "controls", "previewTargets": ["settings", "registry", "controlLab"], "calibrationChromeIsolation": false, "canonicalSource": "computed-style", "projection": "root-semantic-property", "resetScope": "border", "disposition": "EDITABLE", "reason": "" }], "settings": { "id": "globalSettings", "version": 1, "storageKey": "AEToolbox.settings.v1", "legacyStorageKeys": ["AEToolbox.background.v1", "AEToolbox.backgroundSettingsCollapsed.v1", "aeToolbox.language"], "notes": ["Settings is an app-level core panel, not a registry tool.", "Migrated Settings fields are rendered from this app-level schema.", "AEToolbox.settings.v1 remains the formal production Settings storage key for 0.3.0.", "No v2 Settings migration is included in the 0.3.0 release preparation.", "Developer Mode is a core setting for debug/probe/lab registry tool visibility.", "Background Engine UI is schema-rendered; BackgroundEngine behavior remains the runtime authority."], "sections": [{ "id": "general", "titleKey": "settings.sections.general", "fields": [{ "key": "language", "type": "select", "labelKey": "common.language", "defaultValue": "en", "storageSource": "aeToolbox.language", "options": [{ "value": "en", "labelKey": "settings.language.en" }, { "value": "zh-CN", "labelKey": "settings.language.zhCN" }] }, { "key": "registryDebugTools", "type": "switch", "labelKey": "label.registryDebugTools", "descriptionKey": "helper.registryDebugTools", "defaultValue": false, "rules": ["Controls debug/probe/lab registry tool visibility.", "Must not be implemented as a shapeAddProbe-specific condition.", "Disabling Developer Mode must not corrupt saved Home tool order."] }, { "key": "homeIconRadius", "type": "range", "labelKey": "label.homeIconRadius", "descriptionKey": "helper.homeIconRadius", "defaultValue": 25.5, "min": 18, "max": 40, "step": 0.5, "developerOnly": true, "rules": ["Controls the shared proportional radius token for Home procedural tool icons.", "Visible only when Developer Mode is enabled.", "Default preserves the current Home icon geometry."] }, { "key": "homeDragShadowIntensity", "type": "range", "labelKey": "label.homeDragShadowIntensity", "descriptionKey": "helper.homeDragShadowIntensity", "defaultValue": 1, "min": 0, "max": 1.5, "step": 0.05, "developerOnly": true, "rules": ["Controls the Home edit drag shadow intensity.", "Visible only when Developer Mode is enabled.", "Default preserves the current drag shadow."] }] }, { "id": "motion", "titleKey": "section.motion", "fields": [{ "key": "motionSpeed", "type": "range", "labelKey": "label.motionSpeed", "descriptionKey": "helper.motionSpeed", "defaultValue": 1, "min": 0.75, "max": 1.35, "step": 0.05 }, { "key": "uiScale", "type": "range", "labelKey": "label.uiScale", "descriptionKey": "helper.uiScale", "defaultValue": 0.92, "min": 0.62, "max": 1.18, "step": 0.02 }] }, { "id": "vela", "titleKey": "settings.sections.vela", "descriptionKey": "settings.vela.experimentalDescription", "fields": [{ "key": "velaProviderEndpoint", "type": "text", "labelKey": "settings.vela.endpoint", "descriptionKey": "settings.vela.endpointDescription", "defaultValue": "http://127.0.0.1:1234", "maxLength": 512, "spellcheck": false }, { "key": "velaProviderModel", "type": "text", "labelKey": "settings.vela.model", "descriptionKey": "settings.vela.modelDescription", "defaultValue": "qwen3.5-4b", "maxLength": 256, "spellcheck": false }] }, { "id": "proceduralAppearance", "titleKey": "settings.sections.proceduralAppearance", "descriptionKey": "helper.proceduralAppearanceParams", "developerOnly": true, "collapsible": true, "defaultCollapsed": true, "fields": [{ "key": "warp", "type": "range", "labelKey": "label.proceduralParam.warp", "descriptionKey": "helper.proceduralParam.warp", "defaultProvider": "proceduralAppearance", "min": 0, "max": 1, "step": 0.01 }, { "key": "warpIrregularity", "type": "range", "labelKey": "label.proceduralParam.warpIrregularity", "descriptionKey": "helper.proceduralParam.warpIrregularity", "defaultProvider": "proceduralAppearance", "min": 0, "max": 1, "step": 0.01 }, { "key": "flowComplexity", "type": "range", "labelKey": "label.proceduralParam.flowComplexity", "descriptionKey": "helper.proceduralParam.flowComplexity", "defaultProvider": "proceduralAppearance", "min": 0, "max": 1, "step": 0.01 }, { "key": "flowContinuity", "type": "range", "labelKey": "label.proceduralParam.flowContinuity", "descriptionKey": "helper.proceduralParam.flowContinuity", "defaultProvider": "proceduralAppearance", "min": 0, "max": 1, "step": 0.01 }, { "key": "ribbonWidth", "type": "range", "labelKey": "label.proceduralParam.ribbonWidth", "descriptionKey": "helper.proceduralParam.ribbonWidth", "defaultProvider": "proceduralAppearance", "min": 0.06, "max": 0.22, "step": 0.01 }, { "key": "gradientBias", "type": "range", "labelKey": "label.proceduralParam.gradientBias", "descriptionKey": "helper.proceduralParam.gradientBias", "defaultProvider": "proceduralAppearance", "min": 0.15, "max": 0.75, "step": 0.01 }, { "key": "highlightConcentration", "type": "range", "labelKey": "label.proceduralParam.highlightConcentration", "descriptionKey": "helper.proceduralParam.highlightConcentration", "defaultProvider": "proceduralAppearance", "min": 0.35, "max": 1, "step": 0.01 }, { "key": "highlightArea", "type": "range", "labelKey": "label.proceduralParam.highlightArea", "descriptionKey": "helper.proceduralParam.highlightArea", "defaultProvider": "proceduralAppearance", "min": 0.04, "max": 0.12, "step": 0.01 }, { "key": "secondaryHueInfluence", "type": "range", "labelKey": "label.proceduralParam.secondaryHueInfluence", "descriptionKey": "helper.proceduralParam.secondaryHueInfluence", "defaultProvider": "proceduralAppearance", "min": 0, "max": 1, "step": 0.01 }, { "key": "accentPresence", "type": "range", "labelKey": "label.proceduralParam.accentPresence", "descriptionKey": "helper.proceduralParam.accentPresence", "defaultProvider": "proceduralAppearance", "min": 0, "max": 1, "step": 0.01 }, { "key": "highlightTintShift", "type": "range", "labelKey": "label.proceduralParam.highlightTintShift", "descriptionKey": "helper.proceduralParam.highlightTintShift", "defaultProvider": "proceduralAppearance", "min": 0, "max": 1, "step": 0.01 }, { "key": "contrast", "type": "range", "labelKey": "label.proceduralParam.contrast", "descriptionKey": "helper.proceduralParam.contrast", "defaultProvider": "proceduralAppearance", "min": 0, "max": 1, "step": 0.01 }, { "key": "depth", "type": "range", "labelKey": "label.proceduralParam.depth", "descriptionKey": "helper.proceduralParam.depth", "defaultProvider": "proceduralAppearance", "min": 0, "max": 1, "step": 0.01 }, { "key": "saturation", "type": "range", "labelKey": "label.proceduralParam.saturation", "descriptionKey": "helper.proceduralParam.saturation", "defaultProvider": "proceduralAppearance", "min": 0, "max": 1.4, "step": 0.01 }, { "key": "brightness", "type": "range", "labelKey": "label.proceduralParam.brightness", "descriptionKey": "helper.proceduralParam.brightness", "defaultProvider": "proceduralAppearance", "min": 0.2, "max": 1.4, "step": 0.01 }, { "key": "grain", "type": "range", "labelKey": "label.proceduralParam.grain", "descriptionKey": "helper.proceduralParam.grain", "defaultProvider": "proceduralAppearance", "min": 0, "max": 0.5, "step": 0.01 }, { "key": "paletteDarkness", "type": "range", "labelKey": "label.proceduralParam.paletteDarkness", "descriptionKey": "helper.proceduralParam.paletteDarkness", "defaultProvider": "proceduralAppearance", "min": 0, "max": 0.12, "step": 5e-3 }, { "key": "paletteMidLift", "type": "range", "labelKey": "label.proceduralParam.paletteMidLift", "descriptionKey": "helper.proceduralParam.paletteMidLift", "defaultProvider": "proceduralAppearance", "min": 0, "max": 0.12, "step": 5e-3 }, { "key": "paletteLightLift", "type": "range", "labelKey": "label.proceduralParam.paletteLightLift", "descriptionKey": "helper.proceduralParam.paletteLightLift", "defaultProvider": "proceduralAppearance", "min": 0, "max": 0.12, "step": 5e-3 }, { "key": "paletteDarkChroma", "type": "range", "labelKey": "label.proceduralParam.paletteDarkChroma", "descriptionKey": "helper.proceduralParam.paletteDarkChroma", "defaultProvider": "proceduralAppearance", "min": 0.7, "max": 1.1, "step": 0.01 }, { "key": "paletteLightChroma", "type": "range", "labelKey": "label.proceduralParam.paletteLightChroma", "descriptionKey": "helper.proceduralParam.paletteLightChroma", "defaultProvider": "proceduralAppearance", "min": 0.7, "max": 1.1, "step": 0.01 }, { "key": "paletteMapMidpoint", "type": "range", "labelKey": "label.proceduralParam.paletteMapMidpoint", "descriptionKey": "helper.proceduralParam.paletteMapMidpoint", "defaultProvider": "proceduralAppearance", "min": 0.35, "max": 0.65, "step": 0.01 }, { "key": "paletteMapContrast", "type": "range", "labelKey": "label.proceduralParam.paletteMapContrast", "descriptionKey": "helper.proceduralParam.paletteMapContrast", "defaultProvider": "proceduralAppearance", "min": 0.75, "max": 1.25, "step": 0.01 }, { "key": "resetProceduralAppearanceParams", "type": "button", "labelKey": "button.resetProceduralAppearanceParams" }] }, { "id": "theme", "titleKey": "section.theme", "fields": [{ "key": "themeAccent", "type": "color", "labelKey": "label.accentColor", "descriptionKey": "helper.accentColor", "defaultValue": "#d6b25e" }, { "key": "homeBackground", "type": "color", "labelKey": "label.homeBaseColor", "descriptionKey": "helper.homeBaseColor", "defaultValue": "#050403" }, { "key": "toolIconColor", "type": "color", "labelKey": "label.toolIconColor", "descriptionKey": "helper.toolIconColor", "defaultValue": "#15120c", "visibleWhen": { "any": [{ "key": "proceduralIconMode", "equals": "colorful" }, { "all": [{ "key": "proceduralIconMode", "equals": "themeMapped" }, { "key": "toolIconDarkSourceMode", "equals": "manualEndpoints" }] }] } }, { "key": "toolIconLine", "type": "color", "labelKey": "label.toolIconLine", "descriptionKey": "helper.toolIconLine", "defaultValue": "#fff0be", "visibleWhen": { "any": [{ "key": "proceduralIconMode", "equals": "colorful" }, { "all": [{ "key": "proceduralIconMode", "equals": "themeMapped" }, { "key": "toolIconDarkSourceMode", "equals": "manualEndpoints" }] }] } }, { "key": "proceduralIconMode", "type": "select", "labelKey": "label.proceduralIconMode", "descriptionKey": "helper.proceduralIconMode", "defaultValue": "colorful", "options": [{ "value": "colorful", "labelKey": "settings.proceduralIconMode.colorful" }, { "value": "themeMapped", "labelKey": "settings.proceduralIconMode.themeMapped" }] }, { "key": "toolIconDarkSourceMode", "type": "select", "labelKey": "label.iconDarkSource", "descriptionKey": "helper.iconDarkSource", "defaultValue": "manualEndpoints", "options": [{ "value": "manualEndpoints", "labelKey": "settings.iconDarkSource.manualEndpoints" }, { "value": "paletteScale", "labelKey": "settings.iconDarkSource.paletteScale" }], "visibleWhen": { "key": "proceduralIconMode", "equals": "themeMapped" } }, { "key": "toolIconDarkPaletteId", "type": "select", "labelKey": "label.sourcePalette", "descriptionKey": "helper.sourcePalette", "defaultValue": "", "optionsProvider": "proceduralPalettes", "visibleWhen": { "all": [{ "key": "proceduralIconMode", "equals": "themeMapped" }, { "key": "toolIconDarkSourceMode", "equals": "paletteScale" }] } }], "groups": [{ "id": "interfaceAppearance", "titleKey": "settings.theme.coreAppearance", "fields": ["themeAccent", "homeBackground"] }, { "id": "toolIconAppearance", "titleKey": "settings.theme.toolIconAppearance", "fields": ["proceduralIconMode"], "presentations": [{ "type": "note", "key": "proceduralIconModeColorfulNote", "textKey": "helper.proceduralIconModeColorful", "visibleWhen": { "key": "proceduralIconMode", "equals": "colorful" } }, { "type": "note", "key": "proceduralIconModeThemeNote", "textKey": "helper.proceduralIconModeThemeMapped", "visibleWhen": { "key": "proceduralIconMode", "equals": "themeMapped" } }] }, { "id": "iconColors", "titleKey": "settings.theme.iconColors", "collapsible": true, "defaultCollapsed": true, "openWhen": { "key": "proceduralIconMode", "equals": "themeMapped" }, "fields": ["toolIconDarkSourceMode", "toolIconDarkPaletteId", "toolIconColor", "toolIconLine"], "presentations": [{ "type": "colorRampPreview", "key": "proceduralIconColorRamp", "visibleWhen": { "key": "proceduralIconMode", "equals": "themeMapped" } }, { "type": "note", "key": "proceduralFallbackNote", "textKey": "helper.fallbackIconColors", "visibleWhen": { "key": "proceduralIconMode", "equals": "colorful" } }, { "type": "note", "key": "proceduralIconSourceNote", "textKey": "helper.proceduralIconSource", "visibleWhen": { "key": "proceduralIconMode", "equals": "themeMapped" } }] }] }, { "id": "backgroundEngine", "titleKey": "section.backgroundEngine", "collapsible": true, "legacyBehavior": "BackgroundEngine", "migrationRisk": ["BackgroundEngine.applyPreset remains the behavior layer", "BackgroundEngine.save remains the behavior layer", "BackgroundEngine.syncControls remains the behavior layer"], "fields": [{ "key": "backgroundSource", "type": "select", "labelKey": "label.backgroundSource", "descriptionKey": "helper.backgroundSource", "defaultValue": "followIconTheme", "options": [{ "value": "classic", "labelKey": "settings.backgroundSource.classic" }, { "value": "followIconTheme", "labelKey": "settings.backgroundSource.followIconTheme" }, { "value": "procedural", "labelKey": "settings.backgroundSource.procedural" }] }, { "key": "proceduralBackgroundSeed", "type": "text", "labelKey": "label.proceduralBackgroundSeed", "descriptionKey": "helper.proceduralBackgroundSeed", "defaultValue": "background-demo-01" }, { "key": "proceduralBackgroundPaletteId", "type": "select", "labelKey": "label.proceduralBackgroundPalette", "descriptionKey": "helper.proceduralBackgroundPalette", "defaultValue": "algorithmDefault", "optionsProvider": "proceduralBackgroundPalettes" }, { "key": "proceduralBackgroundIntensity", "type": "range", "labelKey": "label.proceduralBackgroundIntensity", "descriptionKey": "helper.proceduralBackgroundIntensity", "defaultValue": 0.28, "min": 0.05, "max": 0.7, "step": 0.01 }, { "key": "proceduralBackgroundRegenerate", "type": "button", "labelKey": "button.regenerateBackgroundSeed" }, { "key": "preset", "type": "select", "labelKey": "label.preset", "descriptionKey": "helper.preset", "defaultValue": "blackGold", "capabilityRequired": "stablePortalSelect", "options": [{ "value": "custom", "labelKey": "settings.backgroundPreset.custom" }, { "value": "blackGold", "labelKey": "settings.backgroundPreset.blackGold" }, { "value": "solarGrid", "labelKey": "settings.backgroundPreset.solarGrid" }, { "value": "obsidianRings", "labelKey": "settings.backgroundPreset.obsidianRings" }, { "value": "midnightBlueprint", "labelKey": "settings.backgroundPreset.midnightBlueprint" }, { "value": "minimalDark", "labelKey": "settings.backgroundPreset.minimalDark" }] }, { "key": "baseColor", "type": "color", "labelKey": "label.background", "defaultValue": "#050403" }, { "key": "secondaryColor", "type": "color", "labelKey": "label.secondary", "defaultValue": "#11100c" }, { "key": "accentColor", "type": "color", "labelKey": "label.accent", "defaultValue": "#c9a452" }, { "key": "accent2Color", "type": "color", "labelKey": "label.accent2", "defaultValue": "#f3d37a" }, { "key": "lineColor", "type": "color", "labelKey": "label.line", "defaultValue": "#d6b25e" }, { "key": "glowColor", "type": "color", "labelKey": "label.glow", "defaultValue": "#c9a452" }, { "key": "glowOpacity", "type": "range", "labelKey": "label.glowIntensity", "defaultValue": 0.22, "min": 0, "max": 1, "step": 0.01 }, { "key": "glowSize", "type": "range", "labelKey": "label.glowSize", "defaultValue": 80, "min": 20, "max": 140, "step": 1 }, { "key": "glowX", "type": "range", "labelKey": "label.glowX", "defaultValue": 74, "min": 0, "max": 100, "step": 1 }, { "key": "glowY", "type": "range", "labelKey": "label.glowY", "defaultValue": 18, "min": 0, "max": 100, "step": 1 }, { "key": "gridOpacity", "type": "range", "labelKey": "label.gridOpacity", "defaultValue": 0.12, "min": 0, "max": 1, "step": 0.01 }, { "key": "gridSize", "type": "range", "labelKey": "label.gridSize", "defaultValue": 36, "min": 12, "max": 96, "step": 1 }, { "key": "lineOpacity", "type": "range", "labelKey": "label.lineOpacity", "defaultValue": 0.18, "min": 0, "max": 1, "step": 0.01 }, { "key": "ringOpacity", "type": "range", "labelKey": "label.ringOpacity", "defaultValue": 0.1, "min": 0, "max": 1, "step": 0.01 }, { "key": "ringScale", "type": "range", "labelKey": "label.ringScale", "defaultValue": 1, "min": 0.5, "max": 2.5, "step": 0.05 }, { "key": "accentAngle", "type": "range", "labelKey": "label.accentAngle", "defaultValue": 135, "min": 0, "max": 360, "step": 1 }, { "key": "patternDensity", "type": "range", "labelKey": "label.patternDensity", "defaultValue": 1, "min": 0.4, "max": 2, "step": 0.05 }, { "key": "contrast", "type": "range", "labelKey": "label.contrast", "defaultValue": 0.45, "min": 0, "max": 1, "step": 0.01 }, { "key": "motionEnable", "type": "switch", "labelKey": "label.enableMotion", "descriptionKey": "helper.enableMotion", "defaultValue": false }, { "key": "motionSpeed", "type": "range", "labelKey": "label.motionSpeed", "defaultValue": 1, "min": 0.5, "max": 2, "step": 0.05 }, { "key": "motionAmount", "type": "range", "labelKey": "label.motionAmount", "defaultValue": 0.35, "min": 0, "max": 1, "step": 0.01 }, { "key": "randomize", "type": "button", "labelKey": "button.randomize", "capabilityRequired": "legacyBackgroundEngineAction" }, { "key": "reset", "type": "button", "labelKey": "button.resetDefaults", "capabilityRequired": "legacyBackgroundEngineAction" }] }] }, "dictionaries": { "en": { "reference.launch": "UI reference pages · 0.3.13-B", "reference.title": "UI reference pages", "reference.fixture": "Isolated fixture · No Provider, Host or asset writes", "reference.exit": "Exit reference", "reference.confirm": "Leave this page?", "reference.unsaved": "This page has unsaved fixture changes. Save a session checkpoint or discard before leaving.", "reference.conversation": "This conversation is not empty. Close and discard its fixture content?", "reference.stay": "Stay", "reference.discard": "Discard and leave", "reference.save": "Save session checkpoint", "reference.reset": "Reset preview", "reference.failSave": "Simulate save failure", "reference.state": "Captured fixture state", "reference.saved": "Session checkpoint saved · persisted: false", "reference.failed": "Save failed · draft retained", "reference.unsavedStatus": "Unsaved fixture changes · persisted: false", "reference.conversationStatus": "Conversation fixture · persisted: false", "reference.fixturePalette": "Fixture palette", "reference.ui.theme": "Theme", "reference.ui.dark": "Dark", "reference.ui.light": "Light", "reference.ui.language": "Language", "reference.ui.uIScale": "UI Scale", "reference.ui.referencePages": "Reference pages", "reference.ui.globalSettings": "Global Settings", "reference.ui.registryControls": "Registry Controls", "reference.ui.paletteCurve": "Palette / Curve", "reference.ui.palette": "Palette", "reference.ui.curve": "Curve", "reference.ui.gradient": "+ Gradient", "reference.ui.new": "+ New", "reference.ui.point": "+ Point", "reference.ui.solid": "+ Solid", "reference.ui.stop": "+ Stop", "reference.ui.aEDataExport": "AE data & export", "reference.ui.aEKeyframeData": "AE keyframe data", "reference.ui.add": "Add", "reference.ui.addASolidColorOrAGradient": "Add a solid color or a gradient.", "reference.ui.addYourFirstColor": "Add your first color", "reference.ui.allColors": "All colors", "reference.ui.allGroups": "All groups", "reference.ui.apply": "Apply", "reference.ui.cancel": "Cancel", "reference.ui.cancelColorEdit": "Cancel color edit", "reference.ui.chooseAPreviewContextAbove": "Choose a preview context above", "reference.ui.chooseASelectionContextAbove": "Choose a selection context above.", "reference.ui.chooseASolidForTheAccentColor": "Choose a solid for the accent color", "reference.ui.chooseAnAxisThenDragInTheColorFieldArrowKeysFineTuneShiftMakesLargerSteps": "Choose an axis, then drag in the color field. Arrow keys fine-tune; Shift makes larger steps.", "reference.ui.clearFilters": "Clear filters", "reference.ui.colorFieldArrowKeysToAdjustShiftForLargerSteps": "Color field; arrow keys to adjust, Shift for larger steps", "reference.ui.colorPicker": "Color picker", "reference.ui.colorPlaneAxis": "Color plane axis", "reference.ui.colorStops": "Color stops", "reference.ui.copy": "Copy", "reference.ui.copyHEX": "Copy HEX", "reference.ui.createACurveToBegin": "Create a curve to begin.", "reference.ui.createAPaletteToBegin": "Create a palette to begin.", "reference.ui.current": "Current", "reference.ui.curveJSON": "Curve JSON", "reference.ui.curveEditor": "Curve editor", "reference.ui.curveGroup": "Curve group", "reference.ui.curveLibrary": "Curve library", "reference.ui.curveName": "Curve name", "reference.ui.curveView": "Curve view", "reference.ui.curvesImported": "Curves imported.", "reference.ui.defaultAppearance": "Default appearance", "reference.ui.defaultSpring": "Default spring", "reference.ui.delete": "Delete", "reference.ui.deleteGroupKeepPalettes": "Delete group; keep palettes", "reference.ui.deletePalette": "Delete palette", "reference.ui.deleteSlot": "Delete slot", "reference.ui.disabled": "Disabled", "reference.ui.dragAPointOrItsHandlesArrowKeysFineTuneShiftMovesFasterSplitASegmentToAddAPointWithoutChangingItsShape": "Drag a point or its handles. Arrow keys fine-tune; Shift moves faster. Split a segment to add a point without changing its shape.", "reference.ui.dragOrUseArrowKeys": "Drag or use arrow keys", "reference.ui.dragToResizeUpDownToAdjust": "Drag to resize · Up / Down to adjust", "reference.ui.duplicate": "Duplicate", "reference.ui.duplicatePalette": "Duplicate palette", "reference.ui.duplicateSlot": "Duplicate slot", "reference.ui.duration": "Duration", "reference.ui.editableTimeAndValueCurve": "Editable time and value curve", "reference.ui.endValue": "End value", "reference.ui.exportDownloaded": "Export downloaded.", "reference.ui.exportLibrary": "Export library", "reference.ui.exportPaintData": "Export paint data", "reference.ui.filterByGroup": "Filter by group", "reference.ui.filterByPaintType": "Filter by paint type", "reference.ui.filterCurvesByGroup": "Filter curves by group", "reference.ui.findAControl": "Find a control", "reference.ui.findAControl70": "Find a control…", "reference.ui.flatTangents": "Flat tangents", "reference.ui.gradientStopChannel": "Gradient stop channel", "reference.ui.gradientStops": "Gradient stops", "reference.ui.groupRemovedItsPalettesAreNowUngrouped": "Group removed. Its palettes are now ungrouped.", "reference.ui.groups": "Groups", "reference.ui.hEXColor": "HEX color", "reference.ui.hEXCopied": "HEX copied.", "reference.ui.handleCoordinates": "Handle coordinates", "reference.ui.importCurves": "Import curves", "reference.ui.importPalettes": "Import palettes", "reference.ui.library": "Library", "reference.ui.linearGradient": "Linear gradient", "reference.ui.localIllustrationNoChangesToAfterEffects": "Local illustration · No changes to After Effects", "reference.ui.moveEarlier": "Move earlier", "reference.ui.moveLater": "Move later", "reference.ui.moveSlotEarlier": "Move slot earlier", "reference.ui.moveSlotLater": "Move slot later", "reference.ui.newCurveGroup": "New curve group", "reference.ui.newGroupName": "New group name", "reference.ui.noMatchingControlsTryAnotherSearch": "No matching controls. Try another search.", "reference.ui.noMatchingCurves": "No matching curves.", "reference.ui.notApplied": "Not applied", "reference.ui.opacity": "Opacity", "reference.ui.opacityIsControlledByTheGradientSOpacityStops": "Opacity is controlled by the gradient’s opacity stops.", "reference.ui.opacityStops": "Opacity stops", "reference.ui.opacityValue": "Opacity value", "reference.ui.openAComposition": "Open a composition", "reference.ui.openColorPicker": "Open color picker", "reference.ui.openStopColorPicker": "Open stop color picker", "reference.ui.original": "Original", "reference.ui.outgoingInterpolation": "Outgoing interpolation", "reference.ui.overlay": "Overlay", "reference.ui.overlayValueAndSpeedCurves": "Overlay value and speed curves", "reference.ui.paintType": "Paint type", "reference.ui.paletteDeletedUndoIsAvailable": "Palette deleted. Undo is available.", "reference.ui.paletteDuplicated": "Palette duplicated.", "reference.ui.paletteEditor": "Palette editor", "reference.ui.paletteGroup": "Palette group", "reference.ui.paletteLibrary": "Palette library", "reference.ui.paletteName": "Palette name", "reference.ui.palettesImportedExistingPalettesWereKept": "Palettes imported. Existing palettes were kept.", "reference.ui.pick": "Pick", "reference.ui.pickAScreenColorEscToCancel": "Pick a screen color · Esc to cancel", "reference.ui.pluginMotion": "Plugin motion", "reference.ui.positionGeometry": "Position & geometry", "reference.ui.preview": "Preview", "reference.ui.previewContext": "Preview & context", "reference.ui.previewDurationInMilliseconds": "Preview duration in milliseconds", "reference.ui.previewResult": "Preview result", "reference.ui.previewSelection": "Preview selection", "reference.ui.previewTime": "Preview time", "reference.ui.radialGradient": "Radial gradient", "reference.ui.readOnly": "Read only", "reference.ui.reloadSaved": "Reload saved", "reference.ui.remove": "Remove", "reference.ui.reset": "Reset", "reference.ui.resizeCurveHeight": "Resize curve height", "reference.ui.restoreOriginalColor": "Restore original color", "reference.ui.restoreThisToolSControls": "Restore this tool’s controls", "reference.ui.restored": "Restored.", "reference.ui.retrySave": "Retry save", "reference.ui.reverse": "Reverse", "reference.ui.reverseIsAvailableForContinuousCurves": "Reverse is available for continuous curves", "reference.ui.searchCurves": "Search curves", "reference.ui.searchCurves135": "Search curves…", "reference.ui.searchPalettesOrHEX": "Search palettes or HEX…", "reference.ui.searchPalettesSlotsOrHEX": "Search palettes, slots or HEX", "reference.ui.selectAndCopyTheHEXValue": "Select and copy the HEX value.", "reference.ui.selectTheHEXFieldToCopyThisColor": "Select the HEX field to copy this color.", "reference.ui.selectedCurvePoint": "Selected curve point", "reference.ui.shapeIllustration": "Shape illustration", "reference.ui.slotName": "Slot name", "reference.ui.solid143": "Solid", "reference.ui.speedValueTime": "Speed · Δvalue / Δtime", "reference.ui.startValue": "Start value", "reference.ui.temporalDataForAScalarPropertyAEHostIntegrationIsAFutureStep": "Temporal data for a scalar property. AE host integration is a future step.", "reference.ui.thisColorChangedElsewhereReopenThePickerToEditItsLatestValue": "This color changed elsewhere. Reopen the picker to edit its latest value.", "reference.ui.thisCurveChangedElsewhereYourDragWasCancelled": "This curve changed elsewhere. Your drag was cancelled.", "reference.ui.thisCurveChangedElsewhereReopenItBeforeEditing": "This curve changed elsewhere. Reopen it before editing.", "reference.ui.time": "Time →", "reference.ui.toolLanguage": "Tool language", "reference.ui.tryAgain": "Try again", "reference.ui.undo": "Undo", "reference.ui.ungrouped": "Ungrouped", "reference.ui.useAsAccent": "Use as accent", "reference.ui.useForUIMotion": "Use for UI motion", "reference.ui.useForToolIcons": "Use for tool icons", "reference.ui.useInVela": "Use in Vela", "reference.ui.usesThisCurveWithADurationUpTo3000Ms": "Uses this curve with a duration up to 3000 ms.", "reference.ui.value": "Value", "reference.ui.speed": "Speed", "reference.ui.withGradients": "With gradients", "reference.ui.withSolids": "With solids", "reference.ui.library164": "‹ Library", "reference.ui.opacity165": "Opacity %", "reference.ui.position": "Position %", "reference.ui.startX": "Start X %", "reference.ui.startY": "Start Y %", "reference.ui.endX": "End X %", "reference.ui.endY": "End Y %", "reference.ui.highlight": "Highlight %", "reference.ui.highlightAngle": "Highlight angle", "reference.ui.angle": "Angle", "reference.ui.radius": "Radius", "reference.ui.gradientAngle": "Gradient angle", "reference.ui.radialRadius": "Radial radius", "reference.ui.time177": "Time %", "reference.ui.value178": "Value %", "reference.ui.inTime": "In · time %", "reference.ui.inValue": "In · value %", "reference.ui.outTime": "Out · time %", "reference.ui.outValue": "Out · value %", "reference.ui.linear": "Linear", "reference.ui.hold": "Hold", "reference.ui.pause": "Pause", "reference.ui.replay": "Replay", "reference.ui.loadingCurves": "Loading curves…", "reference.ui.loadingYourPalettes": "Loading your palettes…", "reference.ui.loading": "Loading…", "reference.ui.saved": "Saved", "reference.ui.saving": "Saving…", "reference.ui.unsavedChanges": "Unsaved changes", "reference.ui.saveUnavailable": "Save unavailable", "reference.ui.saveConflict": "Save conflict", "reference.ui.checkInput": "Check input", "reference.ui.editingCurve": "Editing curve…", "reference.ui.interactivePreviewAfterEffectsIsNotConnected": "Interactive preview · After Effects is not connected", "reference.ui.screenPickingIsnTAvailableInThisBrowserUseTheColorFieldOrEnterHEX": "Screen picking isn’t available in this browser. Use the color field or enter HEX.", "reference.ui.pickAnyScreenColorEscCancelsSampling": "Pick any screen color. Esc cancels sampling.", "reference.ui.samplingCancelledYourDraftIsKept": "Sampling cancelled. Your draft is kept.", "reference.ui.screenPickingFailedTryAgainOrEnterHEX": "Screen picking failed. Try again or enter HEX.", "reference.ui.enterAValidNumber": "Enter a valid number.", "reference.ui.previousValueRestored": " Previous value restored.", "reference.ui.thisEditHasNotBeenApplied": " This edit has not been applied.", "reference.ui.composition": "Composition", "reference.ui.selectedLayers": "Selected layers", "reference.ui.noComposition": "No composition", "reference.ui.noSelection": "No selection", "reference.ui.3TextLayers": "3 text layers", "reference.ui.1ShapeLayer": "1 shape layer", "reference.ui.nodeParameters": "Node parameters", "reference.ui.incomingHandle": "Incoming handle", "reference.ui.outgoingHandle": "Outgoing handle", "reference.ui.previewSettings": "Preview settings", "reference.ui.selectedElement": "Selected element", "reference.ui.node": "Node", "reference.ui.timePositionWithinTheCurve0100": "Time position within the curve; 0–100%.", "reference.ui.valueRelativeToTheUnitIntervalValuesMayOvershoot": "Value relative to the unit interval; values may overshoot.", "reference.ui.endpointsAreFixedAt00And100100": "Endpoints are fixed at (0%, 0%) and (100%, 100%).", "reference.ui.noIncomingSegmentAtTheFirstNode": "No incoming segment at the first node.", "reference.ui.noOutgoingSegmentAtTheLastNode": "No outgoing segment at the last node.", "reference.ui.handlesApplyOnlyToBZierSegmentsChooseBZierToEdit": "Handles apply only to Bézier segments. Choose Bézier to edit.", "reference.ui.timeIsBoundedByTheAdjacentNodesValueRange400500": "Time is bounded by the adjacent nodes. Value range: −400–500%.", "reference.ui.durationAffectsPreviewPlaybackNotAEKeyframes": "Duration affects preview playback, not AE keyframes.", "reference.ui.thisControlsTheReferenceUIMotionOnlyItDoesNotExecuteACurveInAE": "This controls the reference UI motion only; it does not execute a curve in AE.", "reference.ui.ready": "Ready", "reference.ui.unavailable": "Unavailable", "reference.ui.6ShapeLayers": "6 shape layers", "reference.ui.existingComponent": "Existing component", "reference.ui.buildWithIntention": "Build with intention", "reference.ui.makeItMove": "Make it move", "reference.ui.madeInLomond": "Made in Lomond", "reference.ui.previewContextChanged": "Preview context changed", "reference.ui.controlsRestoredToSourceDefaults": "Controls restored to source defaults", "reference.ui.running": "Running…", "reference.ui.completeInspectTheResultBelow": "Complete. Inspect the result below.", "reference.ui.actionFailedCheckTheContextAndTryAgain": "Action failed. Check the context and try again.", "reference.ui.slots": "Slots", "reference.ui.channels": "channels", "reference.ui.hue": "Hue", "reference.ui.saturation": "Saturation", "reference.ui.brightness": "Brightness", "reference.ui.red": "Red", "reference.ui.green": "Green", "reference.ui.blue": "Blue", "reference.ui.color": "Color", "reference.ui.offsetX": "offsetX", "reference.ui.offsetY": "offsetY", "reference.ui.blur": "blur", "reference.ui.spread": "spread", "reference.ui.color251": "color", "reference.ui.alpha": "alpha", "reference.ui.previewField": "Preview field", "reference.ui.enterAValueFromMinToMaxUsingTheFieldStep": "Enter a value from {min} to {max}, using the field step.", "reference.ui.countCurves": "{count} curves", "reference.ui.countPalettes": "{count} palettes", "reference.ui.countStops": "{count} stops", "reference.ui.countSlots": "{count} slots", "reference.ui.renameNameGroup": "Rename {name} group", "reference.ui.deleteNameGroupKeepItsPalettes": "Delete {name} group; keep its palettes", "reference.ui.renameName": "Rename {name}", "reference.ui.deleteNameGroupKeepCurves": "Delete {name} group; keep curves", "reference.ui.channelStopAtPercentPercent": "{channel} stop at {percent} percent", "reference.ui.axisAxis": "{axis} axis", "reference.ui.channelValue": "{channel} value", "reference.ui.holdChannelConstantInThePlane": "Hold {channel} constant in the plane", "reference.ui.colorPickerTitle": "Color picker: {title}", "reference.ui.timeTimeValueValue": "Time {time}%, value {value}%", "reference.ui.fixedEndpoint": "; fixed endpoint", "reference.ui.leftRightAdjustTimeUpDownAdjustValue": "; Left/Right adjust time, Up/Down adjust value", "reference.ui.kindHandleForPointIndex": "{kind} handle for point {index}", "reference.ui.pointIndex": "Point {index}", "reference.ui.incoming": "Incoming", "reference.ui.outgoing": "Outgoing", "reference.ui.controlPointIndexXXYY": "Control point {index}: X {x}, Y {y}", "reference.ui.arrowKeysAdjustShiftForLargerSteps": "; arrow keys adjust, Shift for larger steps", "reference.ui.kindSpeedSpeedInfluenceInfluence": "{kind}: speed {speed}, influence {influence}%", "reference.ui.kindSpeedSpeedUpAndDownArrowsAdjustSpeed": "{kind} speed {speed}; up and down arrows adjust speed", "reference.ui.valueFocused": "value focused", "reference.ui.speedFocused": "speed focused", "reference.ui.valueAndSpeedOverlay": ", value and speed overlay", "reference.ui.influenceSpeed": "↔ Influence · ↕ Speed", "reference.ui.dragHandlesToShapeTheCurve": "Drag handles to shape the curve", "reference.ui.fixtureSaveFailedYourDraftIsRetained": "Fixture save failed; your draft is retained.", "reference.ui.enterA6DigitHEXColorOr8DigitsWithOpacity": "Enter a 6-digit HEX color, or 8 digits with opacity.", "reference.ui.enterA6DigitHEXColor": "Enter a 6-digit HEX color.", "reference.ui.enterASixDigitHEXColor": "Enter a six-digit HEX color.", "reference.ui.invalidColorChannel": "Invalid color channel.", "reference.ui.aGradientCanHaveUpTo32StopsPerChannel": "A gradient can have up to 32 stops per channel.", "reference.ui.invalidOrDuplicateIdentity": "Invalid or duplicate identity.", "reference.ui.namesMustContain180Characters": "Names must contain 1–80 characters.", "reference.ui.colorOrGeometryValueIsOutsideItsRange": "Color or geometry value is outside its range.", "reference.ui.invalidRGBColor": "Invalid RGB color.", "reference.ui.unsupportedPaletteLibrary": "Unsupported palette library.", "reference.ui.paletteGroupDoesNotExist": "Palette group does not exist.", "reference.ui.aPaletteSupportsUpTo64Slots": "A palette supports up to 64 slots.", "reference.ui.unsupportedColorSpace": "Unsupported color space.", "reference.ui.unsupportedPaintType": "Unsupported paint type.", "reference.ui.eachGradientChannelNeeds232Stops": "Each gradient channel needs 2–32 stops.", "reference.ui.invalidGradientPoint": "Invalid gradient point.", "reference.ui.gradientStartAndEndMustDiffer": "Gradient start and end must differ.", "reference.ui.shapeDimensionsMustBePositive": "Shape dimensions must be positive.", "reference.ui.invalidOrDuplicateCurveIdentity": "Invalid or duplicate curve identity.", "reference.ui.useANameOf180Characters": "Use a name of 1–80 characters.", "reference.ui.curveCoordinateIsOutsideItsRange": "Curve coordinate is outside its range.", "reference.ui.unsupportedCurveLibrary": "Unsupported curve library.", "reference.ui.curveGroupDoesNotExist": "Curve group does not exist.", "reference.ui.invalidCurveTags": "Invalid curve tags.", "reference.ui.use2128CurvePoints": "Use 2–128 curve points.", "reference.ui.pointTimesMustIncrease": "Point times must increase.", "reference.ui.unknownInterpolation": "Unknown interpolation.", "reference.ui.invalidControlHandle": "Invalid control handle.", "reference.ui.curveEndpointsMustBe00And11": "Curve endpoints must be (0,0) and (1,1).", "reference.ui.aCurveSupportsUpTo128Points": "A curve supports up to 128 points.", "reference.ui.chooseATimeInsideThisSegment": "Choose a time inside this segment.", "reference.ui.keepTheFirstAndLastPoints": "Keep the first and last points.", "reference.ui.reverseIsAvailableForContinuousCurves317": "Reverse is available for continuous curves.", "reference.ui.useFiniteValuesAndAPositiveDuration": "Use finite values and a positive duration.", "reference.ui.uISettingsAreStillLoading": "UI settings are still loading.", "reference.ui.chooseAnExistingCurve": "Choose an existing curve.", "reference.ui.unknownAppearanceRole": "Unknown appearance role.", "reference.ui.chooseAnExistingColorSlot": "Choose an existing color slot.", "reference.ui.accentColorsUseASolidSlot": "Accent colors use a solid slot.", "reference.ui.invalidUIMotionSettings": "Invalid UI motion settings.", "reference.ui.invalidPaintReference": "Invalid paint reference.", "reference.ui.previewSetup": "Preview setup", "reference.ui.sampleSizesOnce4sThenOpenThePicker": "Sample sizes once (4s); then open the picker", "reference.ui.sizeSamplingEvidence": "Size sampling evidence", "reference.ui.actionFailureFixture": "Action failure fixture", "reference.ui.labPaintModelPaletteV2AdapterPendingSessionDataOnly": "Lab paint model · Palette v2 adapter pending; session data only", "reference.ui.actualAppearanceDesignTuningDefinitionsIsolatedPreview": "Actual Appearance / Design Tuning definitions · isolated preview", "reference.ui.referenceClosed": "Reference closed", "reference.ui.sessionFixturesDisposedCloseThisStandaloneWindowOrReturnToSettings": "Session fixtures disposed. Close this standalone window or return to Settings.", "reference.ui.applyOrCancelTheActiveEditFirst": "Apply or cancel the active edit first.", "reference.ui.liveAppearancePreview": "Live appearance preview", "reference.ui.longSupportingTextRemainsReadableInACompactFieldGroup": "Long supporting text remains readable in a compact field group.", "reference.ui.previewMotion": "Preview motion", "reference.ui.selectedFocusError": "Selected · Focus · Error", "reference.ui.fixtureLibraryOnlyImportExportDoesNotAccessProductionAssets": "Fixture library only. Import/export does not access production assets.", "reference.ui.fixtureOnlyNoAEExecutionOrProductionAssetTransfer": "Fixture only; no AE execution or production asset transfer.", "reference.ui.unavailableInTheSelectedFixtureContext": "Unavailable in the selected fixture context.", "reference.ui.setLayerOpacity": "Set layer opacity", "reference.ui.renameLayer": "Rename layer", "reference.ui.additionalFixtureEvidence": "Additional fixture evidence. ", "reference.ui.commandIsolatedSelectACapturedStateToInspectItsFacts": "Command isolated. Select a captured state to inspect its facts.", "reference.ui.appendLongEvidence": "Append long evidence", "reference.ui.velaConversation": "Vela conversation", "reference.ui.isolatedRuntimeFixture": "Isolated Runtime fixture", "reference.ui.conversationMessages": "Conversation messages", "reference.ui.capturedState": "Captured state", "reference.ui.onlyTheCurrentStepIsReviewedCompletedWorkRemainsAFactAfterRejectionOrFailure": "Only the current step is reviewed. Completed work remains a fact after rejection or failure.", "reference.ui.draftProviderDisabled": "Draft · Provider disabled", "reference.ui.messageVela": "Message Vela", "reference.ui.askVelaOrDescribeAnEdit": "Ask Vela or describe an edit…", "reference.ui.reject": "Reject", "reference.ui.approve": "Approve", "reference.ui.enterNewLineCtrlCmdEnterFixtureSend": "Enter: new line · Ctrl/Cmd+Enter: fixture send", "reference.ui.review": "Review", "reference.ui.currentStep": "Current step", "reference.ui.beforeProposed": "Before → proposed", "reference.ui.reviewIdentityAndTarget": "Review identity and target", "reference.ui.revisionScope": "Revision / scope", "reference.ui.compositionLayer": "Composition / layer", "reference.ui.completed": "Completed", "reference.ui.completion": "Completion", "reference.ui.committed": "Committed", "reference.ui.expectedObserved": "Expected / observed", "reference.ui.committedChangesRemainNoAutomaticRollback": "Committed changes remain. No automatic rollback.", "reference.ui.runtimeProjectionAndProvenance": "Runtime projection and provenance", "reference.ui.storedInThisFixtureConversationOnly": "Stored in this fixture conversation only.", "reference.ui.sizeEvidenceReadySelectTextToCopy": "Size evidence ready · select text to copy", "reference.ui.awaitingApproval": "Awaiting approval", "reference.ui.executing": "Executing", "reference.ui.partiallyCompleted": "Partially completed", "reference.ui.rejected": "Rejected", "reference.ui.cancelled": "Cancelled", "reference.ui.failed": "Failed", "reference.ui.familyAxes": "{family} axes", "reference.ui.twoDimensionalColorField": "two-dimensional color field", "reference.ui.slider": "slider", "reference.ui.editTitle": "Edit {title}", "reference.ui.enableTitle": "Enable {title}", "reference.ui.noMatchingPalettes": "No matching palettes.", "reference.ui.noColorsYet": "No colors yet.", "reference.ui.sizeDiagnostics": "Size diagnostics", "reference.ui.iCanApplyThisStepAfterYourApproval": "I can apply this step after your approval.", "reference.ui.reviewTheProposedChangeAbove": "Review the proposed change above", "reference.ui.capturedExecutionFactsAreShownBelow": "Captured execution facts are shown below.", "reference.ui.reviewID": "Review ID", "reference.ui.appliedToThePluginAppearance": "Applied to the plugin appearance.", "reference.ui.defaultAppearanceRestored": "Default appearance restored.", "reference.ui.defaultSpringRestored": "Default spring restored.", "reference.ui.thisCurveNowDrivesPluginMotion": "This curve now drives plugin motion.", "reference.ui.createAPalette": "Create a palette", "reference.ui.yourLibraryIsEmpty": "Your library is empty.", "reference.ui.previewInterruptedReadyToRetry": "Preview interrupted · Ready to retry", "reference.ui.editSlotInPalette": "Edit {slot} in {palette}", "reference.ui.duplicateName": "Duplicate {name}", "reference.ui.deleteName": "Delete {name}", "reference.ui.selectedLayers400": "selected layers", "reference.ui.chooseAFileSmallerThan2MB": "Choose a file smaller than 2 MB.", "reference.ui.chooseALibrarySmallerThan2MB": "Choose a library smaller than 2 MB.", "reference.ui.exportedKeyframesVeryShortHandlesUseSampledSegments": "Exported keyframes; very short handles use sampled segments.", "reference.ui.exportedTemporalKeyframeData": "Exported temporal keyframe data.", "reference.ui.surfaceTransitionIdentityHandoffRemainsUnresolved": "Surface Transition identity handoff remains unresolved.", "reference.ui.editSelectedElement": "Edit selected element", "reference.ui.backToCurve": "Back to curve", "reference.ui.untitledCurve": "Untitled curve", "reference.ui.untitledPalette": "Untitled palette", "reference.ui.newColor": "New color", "reference.ui.newGradient": "New gradient", "reference.ui.selectedLayer": "Selected layer", "reference.ui.curveType": "Curve type", "reference.ui.curveTypeStructureMotion": "Curve type, structure & UI motion", "app.title": "Lomond Cabinet", "common.home": "Home", "common.back": "Back", "common.done": "Done", "common.close": "Close", "common.editHome": "Edit Home", "common.settings": "Settings", "settings.navigation.appearance": "Appearance", "settings.navigation.general": "General", "settings.navigation.interface": "Interface", "settings.navigation.background": "Background", "settings.navigation.advanced": "Advanced", "settings.navigation.developer": "Developer", "settings.developer.labs": "Labs", "settings.developer.homeCalibration": "Home Calibration", "settings.appearance.title": "Interface Appearance", "settings.appearance.advanced.title": "Advanced Appearance Settings", "settings.appearance.inherited": "Using default / inherited", "settings.appearance.overridden": "Overridden", "settings.appearance.reset": "Reset", "settings.designTuning.title": "Design Tuning", "settings.designTuning.description": "Developer calibration overrides. Canonical defaults remain source-owned.", "settings.designTuning.motion.title": "Motion", "settings.designTuning.motion.curves": "Motion Curves", "settings.designTuning.motion.durations": "Motion Durations", "settings.designTuning.motion.curve.enter": "Enter", "settings.designTuning.motion.curve.exit": "Exit", "settings.designTuning.motion.curve.standard": "Standard", "settings.designTuning.motion.curve.press": "Press", "settings.designTuning.motion.duration.spatialExpand": "Spatial Expand", "settings.designTuning.motion.duration.spatialContract": "Spatial Contract", "settings.designTuning.motion.duration.viewContentEnter": "View Content Enter", "settings.designTuning.motion.duration.viewContentExit": "View Content Exit", "settings.designTuning.motion.duration.actionFeedback": "Action Feedback", "settings.designTuning.motion.duration.actionPress": "Action Press", "settings.designTuning.motion.duration.surfaceState": "Surface State", "settings.designTuning.motion.duration.structuralCollapse": "Structural Collapse", "settings.designTuning.motion.duration.homeHandoffRecede": "Home Handoff Recede", "settings.designTuning.motion.duration.homeHandoffRestore": "Home Handoff Restore", "settings.designTuning.motion.duration.spatialIdentity": "Spatial Identity", "settings.designTuning.motion.duration.toolIdentityOpen": "Tool Identity Open", "settings.designTuning.motion.duration.paletteEnter": "Palette Enter", "settings.designTuning.motion.duration.paletteExit": "Palette Exit", "settings.designTuning.motion.duration.dragSettle": "Drag Settle", "settings.designTuning.default": "Default", "settings.designTuning.overridden": "Overridden", "settings.designTuning.resetMotion": "Reset Motion", "settings.designTuning.promotionEvidence": "Promotion Evidence", "settings.designTuning.curve.progress": "Progress / Value", "settings.designTuning.curve.speed": "Speed", "settings.designTuning.curve.speedHint": "Hold Shift while dragging a Speed handle to adjust influence only.", "settings.designTuning.shadow.offsetX": "X Offset", "settings.designTuning.shadow.offsetY": "Y Offset", "settings.designTuning.shadow.blur": "Blur", "settings.designTuning.shadow.spread": "Spread", "settings.designTuning.shadow.color": "Color", "settings.designTuning.shadow.alpha": "Opacity", "settings.designTuning.spacing.title": "Spacing", "settings.designTuning.radius.title": "Radius", "settings.designTuning.controls.title": "Controls & Geometry", "settings.designTuning.elevation.title": "Elevation", "settings.designTuning.text.title": "Text Color + Alpha", "settings.designTuning.surface.title": "Surface Color + Alpha", "settings.designTuning.border.title": "Border Color + Alpha", "settings.designTuning.resetDomain": "Reset Domain", "settings.designTuning.resetAll": "Reset All Design Tuning", "settings.designTuning.existingAppearance.title": "Existing Appearance / User Parameters", "settings.designTuning.authority.userAppearance": "Authority: User Appearance. These editors do not write Design Tuning overrides.", "settings.designTuning.protected.surface-transition": "Protected by Surface Transition contract", "settings.designTuning.protected.compound-shadow": "Read-only compound shadow", "settings.designTuning.parameter.spacing.surface.edge": "Surface Edge", "settings.designTuning.parameter.spacing.card.inset": "Card Inset", "settings.designTuning.parameter.spacing.content.inlineInset": "Content Inline Inset", "settings.designTuning.parameter.spacing.content.blockInset": "Content Block Inset", "settings.designTuning.parameter.spacing.content.blockInset.description": "The top and bottom inset between a content boundary and its text.", "settings.designTuning.parameter.spacing.section.stack": "Section Stack", "settings.designTuning.parameter.spacing.section.headerContent": "Section Header to Content", "settings.designTuning.parameter.spacing.field.copy": "Field Copy Gap", "settings.designTuning.parameter.spacing.field.block": "Field Block Gap", "settings.designTuning.parameter.spacing.control.inline": "Inline Control Gap", "settings.designTuning.parameter.spacing.settings.fieldControl": "Settings Field to Control", "settings.designTuning.parameter.spacing.registry.cardInset": "Registry Card Inset", "settings.designTuning.parameter.spacing.registry.introContent": "Registry Intro to Content", "settings.designTuning.parameter.spacing.registry.sectionHeaderContent": "Registry Section Header to Content", "settings.designTuning.parameter.spacing.registry.sectionCopy": "Registry Section Copy Gap", "settings.designTuning.parameter.spacing.registry.fieldCopy": "Registry Field Copy Gap", "settings.designTuning.parameter.spacing.registry.fieldControl": "Registry Field to Control", "settings.designTuning.parameter.spacing.palette.fieldControl": "Palette Field to Control", "settings.designTuning.parameter.spacing.home.toolGrid": "Home Tool Grid Gap", "settings.designTuning.parameter.spacing.home.majorStack": "Home Major Stack", "settings.designTuning.parameter.spacing.home.cardTitle": "Home Card Title Gap", "settings.designTuning.parameter.radius.primaryWorkSurface": "Primary Work Surface Radius", "settings.designTuning.parameter.radius.nestedSurface": "Nested Surface Radius", "settings.designTuning.parameter.radius.editableControl": "Editable Control Radius", "settings.designTuning.parameter.radius.sectionCard": "Section Card Radius", "settings.designTuning.parameter.radius.homeTile": "Home Tile Radius", "settings.designTuning.parameter.radius.homeIcon": "Home Icon Radius", "settings.designTuning.parameter.geometry.control.height": "Control Height", "settings.designTuning.parameter.geometry.button.height": "Button Height", "settings.designTuning.parameter.geometry.button.horizontalPadding": "Button Horizontal Padding", "settings.designTuning.parameter.componentOptics.sliderThumbShadow": "Slider Thumb Optical Shadow", "settings.designTuning.parameter.componentOptics.sliderThumbShadow.description": "Controls the component-internal shadow that visually separates shared Slider thumbs from their tracks or backgrounds.", "settings.designTuning.parameter.componentOptics.switchThumbShadow": "Switch Thumb Optical Shadow", "settings.designTuning.parameter.componentOptics.switchThumbShadow.description": "Controls the component-internal shadow that visually separates shared Switch thumbs from their tracks or backgrounds.", "settings.designTuning.parameter.elevation.surfaceShell": "Surface Shell Elevation", "settings.designTuning.parameter.elevation.surfaceShell.description": "Controls the shadow depth of the Tool Detail primary work surface.", "settings.designTuning.parameter.elevation.informationSurface": "Information Surface Elevation", "settings.designTuning.parameter.elevation.informationSurface.description": "Controls the shared shadow depth of read-only Tool Description and Host Status surfaces.", "settings.designTuning.parameter.elevation.primaryAction": "Primary Action Elevation", "settings.designTuning.parameter.elevation.primaryAction.description": "Controls the shadow depth of primary action buttons.", "settings.designTuning.parameter.elevation.utilityAction": "Utility Action Elevation", "settings.designTuning.parameter.elevation.utilityAction.description": "Controls the resting shadow depth of Back, Edit Home, Retry, Vela Settings, Send, Cancel, Approve, and Reject utility actions.", "settings.designTuning.parameter.elevation.floatingSurface": "Floating Surface Elevation", "settings.designTuning.parameter.elevation.floatingSurface.description": "Controls temporary floating surfaces such as Vela Settings and Select menus.", "settings.designTuning.parameter.elevation.floatingPicker": "Floating Picker Elevation", "settings.designTuning.parameter.elevation.floatingPicker.description": "Controls the shadow depth of the Registry color picker.", "settings.designTuning.parameter.elevation.actionContainer": "Action Container Elevation", "settings.designTuning.parameter.elevation.actionContainer.description": "Controls the floating container that carries Tool actions.", "settings.designTuning.parameter.text.secondary": "Secondary Text", "settings.designTuning.parameter.text.tertiary": "Tertiary Text", "settings.designTuning.parameter.surface.field": "Field Surface", "settings.designTuning.parameter.surface.registryOption": "Registry Option Surface", "settings.designTuning.parameter.surface.conversation": "Conversation Surface", "settings.designTuning.parameter.surface.utilityChrome": "Utility Chrome Surface", "settings.designTuning.parameter.surface.utilityAction": "Utility Action Surface", "settings.designTuning.parameter.surface.neutralAction": "Neutral Action Surface", "settings.designTuning.parameter.surface.dangerAction": "Danger Action Surface", "settings.designTuning.parameter.border.separator": "Separator Border", "settings.designTuning.parameter.border.panel": "Panel Border", "settings.designTuning.parameter.border.input": "Input Border", "settings.appearance.percentageUnit": "%", "settings.appearance.typography.title": "Typography", "settings.appearance.typography.subgroup.titles": "Titles", "settings.appearance.typography.subgroup.content": "Content", "settings.appearance.typography.subgroup.code": "Code", "appearance.typography.titleSize.label": "Title Size", "appearance.typography.titleSize.description": "Adjusts Page and Surface titles together while preserving their relative hierarchy.", "appearance.typography.sectionTitleSize.label": "Section Title Size", "appearance.typography.sectionTitleSize.description": "Adjusts Section titles independently from Page and Surface titles.", "appearance.typography.fieldLabelSize.label": "Field Label Size", "appearance.typography.fieldLabelSize.description": "Adjusts semantic Field Labels while preserving each domain's weight emphasis.", "appearance.typography.bodySize.label": "Body Size", "appearance.typography.bodySize.description": "Adjusts Body and Control text together.", "appearance.typography.supportingSize.label": "Supporting Size", "appearance.typography.supportingSize.description": "Adjusts Supporting and derived Eyebrow or category text.", "appearance.typography.codeSize.label": "Code Size", "appearance.typography.codeSize.description": "Adjusts Code text and Palette JSON independently from Supporting text.", "appearance.surface.panel.label": "Panel Surface", "appearance.text.primary.label": "Primary Text", "appearance.text.secondary.label": "Secondary Text", "appearance.text.tertiary.label": "Tertiary Text", "appearance.select.triggerSurface.label": "Select Trigger Surface", "appearance.select.menuSurface.label": "Select Menu Surface", "appearance.base.accent.label": "Accent", "appearance.base.accent.description": "The primary accent color used across the interface.", "appearance.base.canvas.label": "Background", "appearance.base.canvas.description": "The base background color of the interface.", "appearance.layout.scale.label": "Interface Scale", "appearance.layout.scale.description": "Scales interface spacing and type proportionally.", "appearance.motion.speed.label": "Motion Speed", "appearance.motion.speed.description": "Adjusts the pace of motion across the interface.", "appearance.surface.panel.description": "The panel fill used for primary work surfaces.", "appearance.text.primary.description": "The primary text color used for headings and emphasis.", "appearance.text.secondary.description": "The secondary text color used for supporting copy at partial opacity.", "appearance.text.tertiary.description": "The tertiary text color used for muted or less prominent copy.", "appearance.select.triggerSurface.description": "The fill used behind the Select trigger.", "appearance.select.menuSurface.description": "The fill used behind the Select popup menu.", "appearance.interaction.focusRing.label": "Focus Ring", "appearance.interaction.focusRing.description": "The focus indicator ring color for interactive controls.", "appearance.interaction.focusBorder.label": "Focus Border", "appearance.interaction.focusBorder.description": "The border color applied to a focused control.", "appearance.interaction.hoverBorder.label": "Hover Border", "appearance.interaction.hoverBorder.description": "The border color applied while a control is hovered.", "appearance.interaction.hoverSurface.label": "Hover Surface", "appearance.interaction.hoverSurface.description": "The fill applied while a control is hovered.", "appearance.interaction.selectedSurface.label": "Selected Surface", "appearance.interaction.selectedSurface.description": "The fill used for the selected option or item.", "appearance.interaction.selectedForeground.label": "Selected Foreground", "appearance.interaction.selectedForeground.description": "The foreground color used for the selected item.", "appearance.interaction.checkedSurface.label": "Checked Surface", "appearance.interaction.checkedSurface.description": "The fill used for the checked control state.", "appearance.action.primarySurface.label": "Primary Action Surface", "appearance.action.primarySurface.description": "The base fill of the primary action.", "appearance.action.primaryHoverSurface.label": "Primary Action Hover Surface", "appearance.action.primaryHoverSurface.description": "The hover fill of the primary action.", "appearance.action.primaryForeground.label": "Primary Action Foreground", "appearance.action.primaryForeground.description": "The foreground (content) color of the primary action.", "appearance.selection.indicatorSurface.label": "Selection Indicator Surface", "appearance.selection.indicatorSurface.description": "The fill of the selection indicator.", "settings.sections.general": "General", "settings.language.en": "English", "settings.language.zhCN": "简体中文", "common.global": "Global", "common.language": "Language", "common.apply": "Apply", "common.create": "Create", "common.refresh": "Refresh", "common.retry": "Retry", "assets.notSaved": "Changes are not saved. Retry or restore the saved values before leaving.", "assets.restoreSaved": "Restore saved values", "assets.noSavedBaseline": "No reliable saved values to restore", "common.reset": "Reset", "common.resetDefaults": "Reset Defaults", "common.restoreDefaults": "Restore Defaults", "common.valuesReset": "Values reset to defaults.", "common.saved": "Saved", "common.cancel": "Cancel", "common.ready": "Ready", "common.error": "Error", "common.unavailable": "Unavailable", "common.none": "None", "common.solid": "Solid", "common.gradient": "Gradient", "common.enabled": "Enabled", "common.disabled": "Disabled", "common.auto": "Auto", "common.fixed": "Fixed", "common.left": "Left", "common.center": "Center", "common.right": "Right", "common.timeline": "Timeline", "common.yPosition": "Y Position", "common.xPosition": "X Position", "common.rowMajor": "Row-Major", "common.fitBox": "Fit Box", "common.uniformHeight": "Uniform Height", "common.uniformWidth": "Uniform Width", "common.registry": "Registry", "common.parameters": "Parameters", "core.bezier.speedInfluenceHint": "Shift + horizontal drag: influence only", "tools.moreTools.title": "More Tools", "tools.quickStack.title": "Quick Stack", "vela.surfaceLabel": "Vela", "vela.surfaceTranscriptIntro": "Start a local conversation with Vela.", "vela.surfaceReasoningActive": "Thinking…", "vela.surfaceReasoningResponse": "Thinking process", "vela.surfaceReasoningCompleted": "Output stream ended", "vela.surfaceReasoningFailed": "Output stream ended with an issue", "vela.surfaceReasoningCancelled": "Output stream cancelled", "vela.surfaceComposerPlaceholder": "Message Vela", "vela.surfaceComposerLabel": "Vela message", "vela.surfaceStatusSetup": "Ready for a local message", "vela.surfaceStatusComposing": "Drafting a local message", "vela.surfaceStatusExperimentalUnavailable": "Provider unavailable until manual opt-in", "vela.surfaceStatusExperimentalDisabled": "Experimental Provider disabled", "vela.surfaceStatusExperimentalConfiguring": "Configure and acknowledge the experimental Provider", "vela.surfaceStatusExperimentalChecking": "Checking the loaded local model", "vela.surfaceStatusEndpointInvalid": "Local endpoint is invalid", "vela.surfaceStatusReadinessNetworkFailed": "Cannot reach the local LM Studio server", "vela.surfaceStatusReadinessHttpFailed": "Local LM Studio readiness request failed", "vela.surfaceStatusReadinessResponseInvalid": "Local LM Studio returned an invalid readiness response", "vela.surfaceStatusModelNotFound": "Configured model was not found", "vela.surfaceStatusModelNotLoaded": "Configured model is not loaded", "vela.surfaceExperimentalStatus": "Experimental · Not qualified · Manual opt-in required", "vela.surfaceSettings": "Settings", "vela.surfaceResize": "Resize Vela conversation area", "vela.conversationLabel": "Conversation {n}", "vela.conversationSelect": "Select conversation", "vela.conversationNew": "New conversation", "vela.conversationClose": "Close conversation", "vela.conversationRunning": "Running", "vela.conversationOtherRunning": "Another conversation is running", "vela.surfaceStoppingTask": "The active task is still settling; sending is unavailable", "vela.conversationLimit": "Up to 8 conversations. Close one to create another.", "vela.conversationActiveClose": "Finish or cancel this conversation before closing", "vela.conversationLastClose": "Keep at least one conversation", "vela.conversationOperationFailed": "Conversation operation failed. Please try again.", "vela.surfaceSend": "Send", "vela.surfaceCancel": "Cancel", "vela.surfaceStatusPending": "Waiting for local model", "vela.surfaceStatusAwaitingContinuation": "Approved, awaiting continuation", "vela.surfaceStatusCompleted": "Local response received", "vela.surfaceStatusCancelled": "Local request cancelled", "vela.surfaceStatusBlocked": "Local action requires authorization", "vela.surfaceStatusContextStale": "Context changed. Start the action again", "vela.surfaceStatusFailed": "Local request failed", "vela.surfaceStatusIntentRejected": "An explicit opacity edit is needed", "vela.surfaceProviderError": "Local provider error", "vela.surfaceProviderNoDisplayableText": "The local model did not return displayable text.", "vela.surfaceLocalProposalNotice": "A local action suggestion was received.\nThis conversation area does not yet support viewing or executing it.", "vela.surfaceIntentRejected": "No explicit opacity edit was detected. Specify the target opacity for the current layer (0–100%).", "vela.surfaceIntentTargetMismatch": "The local proposal did not match the opacity requested in this turn. No action was created.", "vela.surfaceContextUnavailable": "Unable to read the available After Effects context. Open a composition and select at least one layer, then try again.", "vela.surfaceNoActionableTarget": "No actionable target is selected. Select a layer in After Effects and send the request again.", "vela.surfaceProviderConnection": "Unable to connect to LM Studio. Start the local server and check it is available, then try again.", "vela.surfaceProviderTimeout": "The local model took too long to respond. Check LM Studio and try again.", "vela.surfaceProviderCancelled": "The local request was cancelled.", "vela.surfaceProviderResponse": "The local model returned a response that could not be used. Try again.", "vela.surfaceProviderConfiguration": "The local model configuration is unavailable. Check LM Studio and try again.", "vela.surfaceRuntimeUnavailable": "Vela is temporarily unavailable. Reopen the panel and try again.", "vela.surfaceReviewRequired": "This action requires authorization before it can run. Allow the next opacity change, then send a new request.", "vela.surfacePermissionDenied": "This action was not authorized and was not performed.", "vela.surfaceGenericError": "The local request could not be completed. Try again.", "vela.surfaceReview": "Review", "vela.reviewTargetIds": "Composition ID: {comp}\nLayer ID: {layer}", "vela.reviewCurrentStepScope": "Approve only this step ({current}/{total}). Later steps are not authorized by this approval.", "vela.reviewUnavailable": "The captured target or change cannot be verified for this review. Approval is blocked. Reject and request a new review.", "vela.reviewUnavailableValue": "Unavailable", "vela.reviewShowDetails": "Read full change", "vela.reviewHideDetails": "Hide full change", "vela.reviewBefore": "Before (strings use quoted notation)", "vela.reviewProposed": "Proposed", "vela.surfaceGrantOpacityConsent": "Allow the next opacity change (once, 60 seconds)", "vela.surfaceRevokeOpacityConsent": "Revoke automatic opacity change", "vela.surfaceAuthorityStatus.active": "The next opacity change is allowed", "vela.surfaceAuthorityStatus.executing": "Applying the authorized opacity change", "vela.surfaceAuthorityStatus.consumed": "The one-time automatic change permission was used", "vela.surfaceAuthorityStatus.revoked": "Automatic opacity change permission revoked", "vela.surfaceAuthorityStatus.expired": "Automatic opacity change permission expired", "vela.surfaceAuthorityStatus.failed": "The authorized change failed; the one-time permission was used", "vela.surfaceApprove": "Approve", "vela.surfaceReject": "Reject", "vela.surfaceStatusProposalReady": "Local action suggestion ready for review", "vela.surfaceStatusConfirmation": "Confirm local opacity change", "vela.surfaceStatusLayerNameConfirmation": "Confirm local layer rename", "vela.surfaceStatusExecuting": "Applying local opacity change", "vela.surfaceStatusExecutionCompleted": "Local opacity change completed", "vela.surfaceStatusRejected": "Local action suggestion rejected", "vela.surfaceStatusExecutionFailed": "Local opacity change failed", "vela.surfaceConfirmationReady": "A local opacity change is ready for confirmation.", "vela.surfaceConfirmationLayerNameReady": "A local layer rename is ready for confirmation.", "vela.surfaceConfirmationRejected": "The local action suggestion was rejected. No change was made.", "vela.surfaceExecutionCompleted": "The local opacity change was completed.", "vela.surfaceConfirmationValue": "Opacity {before}% → {proposed}%", "vela.surfaceConfirmationLayerName": "Layer name: {before} → {proposed}", "vela.planReviewCapabilitySetLayerName": "Rename layer", "vela.planReviewCapabilitySetOpacity": "Layer opacity", "vela.planReviewParameterLayerName": "Layer name", "settings.sections.vela": "Vela", "settings.vela.title": "Vela Settings", "settings.vela.model": "Model name", "settings.vela.modelDescription": "Use the exact model identifier currently loaded or exposed by LM Studio.", "settings.vela.fixedEndpoint": "Vela connects only to local LM Studio at http://127.0.0.1:1234/v1/chat/completions. This endpoint is fixed and cannot be changed here.", "settings.vela.experimentalDescription": "Experimental · Not qualified · Manual opt-in required. Session enablement is never saved.", "settings.vela.endpoint": "Local endpoint", "settings.vela.endpointDescription": "Loopback LM Studio endpoint only (127.0.0.1, localhost, or ::1).", "settings.vela.acknowledgement": "I understand this Provider is experimental and not qualified", "settings.vela.enableSession": "Enable for this session", "settings.vela.disableSession": "Disable", "settings.vela.disabled": "Experimental Provider disabled", "settings.vela.checking": "Checking loaded local model…", "settings.vela.ready": "Experimental Provider ready for this session", "settings.vela.unavailable": "Configured local model is unavailable or not loaded", "settings.vela.endpointInvalid": "The endpoint must be a loopback LM Studio base URL", "settings.vela.networkFailed": "Cannot reach the local LM Studio server", "settings.vela.httpFailed": "LM Studio readiness returned an unsuccessful response", "settings.vela.responseInvalid": "LM Studio returned an invalid readiness response", "settings.vela.modelNotFound": "The configured model was not found", "settings.vela.modelNotLoaded": "The configured model is installed but not loaded", "section.geometry": "Geometry", "section.bounds": "Bounds", "section.fill": "Fill", "section.surface": "Surface", "section.stroke": "Stroke", "section.outline": "Outline", "section.selection": "Selection", "section.layerInfo": "Layer Info", "section.contentsAdd": "Contents Add", "section.nativeShapeItems": "Native shape items", "section.defaults": "Defaults", "section.strokeFillDefaults": "Stroke / Fill defaults", "section.trimPaths": "Trim Paths", "section.strokeTaper": "Stroke Taper", "section.motion": "Motion", "section.animation": "Animation", "section.color": "Color", "section.theme": "Theme", "section.debug": "Debug", "section.developerTools": "Developer Tools", "settings.sections.proceduralAppearance": "Procedural Appearance Parameters", "section.procedural": "Procedural", "section.backgroundEngine": "Background Engine", "section.shape": "Shape", "settings.theme.interfaceAppearance": "Interface Appearance", "settings.theme.coreAppearance": "Core Appearance", "settings.theme.toolIconAppearance": "Tool Icon Appearance", "settings.theme.iconColors": "Icon Theme Endpoints", "settings.theme.fallbackIconColors": "Fallback Icon Colors", "settings.theme.colorRamp": "Dark endpoint to light endpoint", "settings.theme.darkEndpoint": "Dark", "settings.theme.lightEndpoint": "Light", "settings.paletteLibrary": "Palette Library", "settings.paletteSummary.builtIn": "built-in", "settings.paletteSummary.custom": "custom", "settings.paletteSummary.overrides": "tool overrides", "settings.palette.manage": "Manage Palettes", "settings.palette.manageSource": "Manage Source Palettes", "paletteLibrary.title": "Palette Library", "paletteLibrary.description": "Edit curated procedural palettes, custom palettes, and Home tool color assignments.", "paletteLibrary.builtIn": "Built-in", "paletteLibrary.custom": "Custom", "paletteLibrary.modified": "Modified", "paletteLibrary.displayName": "Display name", "paletteLibrary.shadow": "Shadow", "paletteLibrary.base": "Base", "paletteLibrary.secondary": "Secondary", "paletteLibrary.highlight": "Highlight", "paletteLibrary.stop1": "Stop 1", "paletteLibrary.stop2": "Stop 2", "paletteLibrary.stop3": "Stop 3", "paletteLibrary.stop4": "Stop 4", "paletteLibrary.weight.shadow": "Shadow weight", "paletteLibrary.weight.base": "Base weight", "paletteLibrary.weight.secondary": "Secondary weight", "paletteLibrary.weight.highlight": "Highlight weight", "paletteLibrary.new": "New Palette", "paletteLibrary.duplicate": "Duplicate", "paletteLibrary.duplicatePalette": "Duplicate Palette", "paletteLibrary.legacyReadOnly": "This Palette uses advanced slot relationships and is read-only in the current editor.", "paletteLibrary.delete": "Delete", "paletteLibrary.hide": "Hide", "paletteLibrary.show": "Show", "paletteLibrary.restoreDefaults": "Restore Defaults", "paletteLibrary.import": "Import", "paletteLibrary.export": "Export", "paletteLibrary.replace": "Replace", "paletteLibrary.merge": "Merge", "paletteLibrary.invalidPalette": "Invalid Palette", "paletteLibrary.paletteInUse": "Palette In Use", "paletteLibrary.unsavedChanges": "Unsaved Changes", "paletteLibrary.saved": "Saved", "paletteLibrary.save": "Save", "paletteLibrary.cancel": "Cancel", "paletteLibrary.saveAndContinue": "Save and Continue", "paletteLibrary.discardChanges": "Discard Changes", "paletteLibrary.open": "Open Palette Library", "paletteLibrary.backToSettings": "Back to Settings", "paletteLibrary.resizePaletteList": "Resize Palette List", "paletteLibrary.deletePalette": "Delete Palette", "paletteLibrary.deleteConfirmation": "Delete {name}? This palette is used by {count} tools.", "paletteLibrary.paletteDeleted": "Palette deleted", "paletteLibrary.exportConfiguration": "Export Palette Configuration", "paletteLibrary.exportDescription": "Export custom palettes, built-in overrides, and Home tool assignments for backup or migration.", "paletteLibrary.exportResult": "Export Result", "paletteLibrary.generateJson": "Generate JSON", "paletteLibrary.copyJson": "Copy Export JSON", "paletteLibrary.exportCopied": "Export Copied", "paletteLibrary.importConfiguration": "Import Palette Configuration", "paletteLibrary.importDescription": "Paste previously exported JSON, then merge it with or replace the current user configuration.", "paletteLibrary.importInput": "Paste Import JSON", "paletteLibrary.pasteJsonPlaceholder": "Paste exported palette JSON here", "paletteLibrary.validate": "Validate", "paletteLibrary.jsonValid": "JSON is valid", "paletteLibrary.mergeImport": "Merge Import", "paletteLibrary.replaceImport": "Replace Import", "paletteLibrary.replaceConfirmation": "Replace all custom palettes, built-in overrides, and Home assignments? Factory palettes remain available.", "paletteLibrary.clear": "Clear", "paletteLibrary.invalidJson": "Invalid JSON", "paletteLibrary.importSuccessful": "Import Successful", "paletteLibrary.toolMapping": "Home tool palette mapping", "paletteLibrary.importExport": "Import / Export JSON", "paletteLibrary.tool.shapeAdd": "Shape Add", "paletteLibrary.tool.textBackgroundBox": "Text Background Box", "paletteLibrary.tool.selectionInfo": "Selection Info", "paletteLibrary.tool.ecommerceLayout": "Ad Component Kit", "paletteLibrary.tool.proceduralAppearanceLab": "Procedural Appearance Lab", "paletteLibrary.tool.registryControlLab": "Registry Control Lab", "tools.registryControlLab.fields.shadowField": "Shadow", "tools.registryControlLab.fields.colorAlphaField": "Color + Alpha", "tools.registryControlLab.sections.coreUiDirect": "CoreUI Direct", "paletteLibrary.tool.settingsRendererLab": "Settings Renderer Lab", "paletteLibrary.dynamicSlots": "Dynamic slots", "paletteLibrary.proceduralProfile": "Procedural profile", "paletteLibrary.slotLabel": "Slot label", "paletteLibrary.slotKind": "Slot kind", "paletteLibrary.slotColor": "Color", "paletteLibrary.sourceSlot": "Source slot", "paletteLibrary.sourceSlot1": "Source A", "paletteLibrary.sourceSlot2": "Source B", "paletteLibrary.derivation": "Derivation", "paletteLibrary.parameter.amount": "Amount", "paletteLibrary.parameter.hueDelta": "Hue delta", "paletteLibrary.parameter.lightnessDelta": "Lightness delta", "paletteLibrary.parameter.chromaScale": "Chroma scale", "paletteLibrary.parameter.saturationBias": "Saturation bias", "paletteLibrary.parameter.luminanceBias": "Luminance bias", "paletteLibrary.parameter.contrastBias": "Contrast bias", "paletteLibrary.addDIRECT": "Add direct", "paletteLibrary.addREFERENCE": "Add reference", "paletteLibrary.addDERIVED": "Add derived", "paletteLibrary.moveUp": "Move up", "paletteLibrary.moveDown": "Move down", "paletteLibrary.slotDeleteBlocked": "Slot is still required by:", "label.paddingX": "Padding X", "label.paddingY": "Padding Y", "label.roundness": "Roundness", "label.fillColor": "Fill Color", "label.fillOpacity": "Fill Opacity", "label.strokeColor": "Stroke Color", "label.strokeWidth": "Stroke Width", "label.miterLimit": "Miter Limit", "label.strokeOpacity": "Stroke Opacity", "label.autoSelectionStatus": "Auto selection status", "label.registryDebugTools": "Developer Mode", "label.homeIconRadius": "Home icon radius", "label.homeDragShadowIntensity": "Home drag shadow", "label.strokeFillLayer": "New Stroke / Fill Shape Layer", "label.trimStart": "Trim Start", "label.trimEnd": "Trim End", "label.trimOffset": "Trim Offset", "label.startLength": "Start Length", "label.endLength": "End Length", "label.startWidth": "Start Width", "label.endWidth": "End Width", "label.startEase": "Start Ease", "label.endEase": "End Ease", "label.motionSpeed": "Motion speed", "label.uiScale": "UI scale", "label.accentColor": "Interface Accent", "label.homeBaseColor": "Home Base Color", "label.toolIconColor": "Icon Dark Color", "label.toolIconLine": "Icon Light Color", "label.proceduralIconMode": "Icon Color Mode", "label.proceduralParam.warp": "Warp", "label.proceduralParam.warpIrregularity": "Warp irregularity", "label.proceduralParam.flowComplexity": "Flow complexity", "label.proceduralParam.flowContinuity": "Flow continuity", "label.proceduralParam.ribbonWidth": "Ribbon width", "label.proceduralParam.gradientBias": "Gradient bias", "label.proceduralParam.highlightConcentration": "Highlight concentration", "label.proceduralParam.highlightArea": "Highlight area", "label.proceduralParam.secondaryHueInfluence": "Secondary hue influence", "label.proceduralParam.accentPresence": "Accent presence", "label.proceduralParam.highlightTintShift": "Highlight tint shift", "label.proceduralParam.contrast": "Contrast", "label.proceduralParam.depth": "Depth", "label.proceduralParam.saturation": "Saturation", "label.proceduralParam.brightness": "Brightness", "label.proceduralParam.grain": "Grain", "label.proceduralParam.paletteDarkness": "Palette shadow darkening", "label.proceduralParam.paletteMidLift": "Palette base lightness lift", "label.proceduralParam.paletteLightLift": "Palette highlight lightness lift", "label.proceduralParam.paletteDarkChroma": "Palette shadow chroma", "label.proceduralParam.paletteLightChroma": "Palette highlight chroma", "label.proceduralParam.paletteMapMidpoint": "Palette mapping midpoint", "label.proceduralParam.paletteMapContrast": "Palette mapping contrast", "label.iconDarkSource": "Icon Dark Source", "label.sourcePalette": "Source Palette", "label.backgroundSource": "Background Source", "label.proceduralBackgroundSeed": "Procedural Seed", "label.proceduralBackgroundPalette": "Source Palette", "label.proceduralBackgroundIntensity": "Background Intensity", "label.preset": "Preset", "label.background": "Background", "label.secondary": "Secondary", "label.accent": "Accent", "label.accent2": "Accent 2", "label.line": "Line", "label.glow": "Glow", "label.glowIntensity": "Glow Intensity", "label.glowSize": "Glow Size", "label.glowX": "Glow X", "label.glowY": "Glow Y", "label.gridOpacity": "Grid Opacity", "label.gridSize": "Grid Size", "label.lineOpacity": "Line Opacity", "label.ringOpacity": "Ring Opacity", "label.ringScale": "Ring Scale", "label.accentAngle": "Accent Angle", "label.patternDensity": "Pattern Density", "label.contrast": "Contrast", "label.enableMotion": "Enable Motion", "label.motionAmount": "Motion Amount", "label.gap": "Gap", "label.cornerRadius": "Corner Radius", "label.pillWidthMode": "Pill Width Mode", "label.fixedWidth": "Fixed Width", "label.gradientEnable": "Gradient Enable", "label.textAlign": "Text Align", "label.sort": "Sort", "label.columns": "Columns", "label.normalizeMode": "Normalize Mode", "label.targetWidth": "Target Width", "label.targetHeight": "Target Height", "label.cellWidth": "Cell Width", "label.cellHeight": "Cell Height", "label.gapX": "Gap X", "label.gapY": "Gap Y", "label.lastRowAlign": "Last Row Align", "helper.autoSelectionStatus": "Refresh selected text layer count while the panel is open.", "helper.motionSpeed": "Adjust panel transitions. 1.00 is balanced.", "helper.uiScale": "Adjust text and control density for narrow panels.", "helper.accentColor": "Used for primary actions, focus states, and key interface accents.", "helper.homeBaseColor": "Sets the underlying base color of the Home surface; it does not define the complete background treatment.", "helper.toolIconColor": "Theme-mapped dark endpoint and fallback icon plate color.", "helper.toolIconLine": "Adjusts the Theme-mapped light endpoint and fallback glyph line color.", "helper.iconDarkSource": "Choose a manual dark endpoint or use the base color from a visible source palette.", "helper.sourcePalette": "The resolved palette base color becomes the Theme-mapped dark endpoint.", "helper.proceduralIconMode": "Colorful mode uses each tool's assigned palette. Theme-mapped mode maps image luminance between the base and accent colors.", "helper.proceduralIconModeColorful": "Uses each tool's assigned palette as its final color appearance.", "helper.proceduralIconModeThemeMapped": "Preserves the generated texture and remaps its luminance between two theme colors.", "helper.proceduralIconSource": "Source palettes still define each tool's generated texture and luminance structure. Theme mapping replaces the final hue, not the procedural identity.", "helper.fallbackIconColors": "Only used when a procedural icon cannot render and the fallback glyph is shown.", "settings.proceduralIconMode.colorful": "Colorful", "settings.proceduralIconMode.themeMapped": "Theme-mapped", "settings.iconDarkSource.manualEndpoints": "Manual Endpoints", "settings.iconDarkSource.paletteScale": "Palette Scale", "settings.palette.none": "No source palette available", "settings.backgroundSource.classic": "Classic", "settings.backgroundSource.followIconTheme": "Follow Icon Theme", "settings.backgroundSource.procedural": "Manual Procedural", "settings.backgroundPalette.algorithmDefault": "Current Algorithm", "settings.theme.midEndpoint": "Mid", "status.paletteAccentSuggested": "Palette secondary color applied to Interface Accent; it can be adjusted independently.", "helper.registryDebugTools": "Show debug, probe, and lab registry tools for development testing.", "helper.proceduralAppearanceParams": "Developer-only shared parameters for procedural icon and background source rendering. Changes update both targets in real time.", "helper.proceduralParam.warp": "Overall coordinate displacement strength.", "helper.proceduralParam.warpIrregularity": "Adds uneven local field movement.", "helper.proceduralParam.flowComplexity": "Controls the number of layered flow influences.", "helper.proceduralParam.flowContinuity": "Controls how smoothly flow structures blend.", "helper.proceduralParam.ribbonWidth": "Controls the width of continuous flow bands.", "helper.proceduralParam.gradientBias": "Remaps the gradient toward its brighter or darker range.", "helper.proceduralParam.highlightConcentration": "Controls how tightly highlights gather.", "helper.proceduralParam.highlightArea": "Limits the area occupied by highlights.", "helper.proceduralParam.secondaryHueInfluence": "Controls the visible contribution of the secondary hue.", "helper.proceduralParam.accentPresence": "Controls the amount of local accent color.", "helper.proceduralParam.highlightTintShift": "Controls the hue shift applied to highlights.", "helper.proceduralParam.contrast": "Controls separation between light and dark structure.", "helper.proceduralParam.depth": "Controls layered depth and fold shading.", "helper.proceduralParam.saturation": "Controls overall color intensity.", "helper.proceduralParam.brightness": "Controls the overall luminous level.", "helper.proceduralParam.grain": "Adds a restrained deterministic surface texture.", "helper.proceduralParam.paletteDarkness": "Darkens the palette shadow endpoint in OKLab.", "helper.proceduralParam.paletteMidLift": "Lifts the palette base into the middle mapping stop.", "helper.proceduralParam.paletteLightLift": "Lifts the palette highlight endpoint in OKLab.", "helper.proceduralParam.paletteDarkChroma": "Controls shadow chroma compression during palette mapping.", "helper.proceduralParam.paletteLightChroma": "Controls highlight chroma compression during palette mapping.", "helper.proceduralParam.paletteMapMidpoint": "Sets the source luminance that maps to the palette middle stop.", "helper.proceduralParam.paletteMapContrast": "Shapes the dark-to-mid and mid-to-light luminance response.", "helper.homeIconRadius": "Developer-only proportional radius for Home tool icons and matching square previews.", "helper.homeDragShadowIntensity": "Developer-only intensity for the soft shadow shown under the currently dragged Home icon.", "helper.preset": "Start from a designed procedural look.", "helper.enableMotion": "Uses slow opacity and transform only.", "helper.backgroundSource": "Classic keeps the existing Background Engine. Follow Icon Theme mirrors the icon theme relationship. Manual Procedural uses the background seed and palette below.", "helper.proceduralBackgroundSeed": "A stable manual seed controls the procedural background composition and is independent from tool icon ids.", "helper.proceduralBackgroundPalette": "Use a resolved palette as the procedural background color source.", "helper.proceduralBackgroundIntensity": "Controls procedural background visibility without changing its source identity.", "settings.backgroundPreset.custom": "Custom", "settings.backgroundPreset.blackGold": "Black Gold Default", "settings.backgroundPreset.solarGrid": "Solar Grid", "settings.backgroundPreset.obsidianRings": "Obsidian Rings", "settings.backgroundPreset.midnightBlueprint": "Midnight Blueprint", "settings.backgroundPreset.minimalDark": "Minimal Dark", "helper.refreshSelectionPrompt": "Click Refresh Selection to inspect the current comp selection.", "button.createBackgroundBox": "Create Rounded Rectangle", "button.refreshSelection": "Refresh Selection", "button.randomize": "Randomize", "button.resetDefaults": "Reset Defaults", "button.resetProceduralAppearanceParams": "Restore Procedural Defaults", "button.regenerateBackgroundSeed": "Regenerate Seed", "status.ready": "Ready", "status.readyPeriod": "Ready.", "status.loadingHost": "Loading host JSX...", "status.hostLoading": "Host JSX is still loading...", "status.hostLoadError": "Error: host JSX did not load. Check host/index.jsx includes.", "bootstrap.loadingTools": "Loading tools...", "bootstrap.partialFailure": "Some tools failed to load.", "bootstrap.loadFailed": "Tools failed to load.", "bootstrap.retry": "Retry", "status.noActiveComp": "No active composition", "status.openComp": "Please open a composition", "status.noLayer": "Please select at least one layer", "status.noTextLayer": "Please select at least one text layer", "status.selectShapeLayer": "Please select a shape layer", "status.createdItems": "Created {count} item(s)", "status.createdBackgroundBoxes": "Created {count} background rounded rectangle(s)", "status.createdStrokeFillLayer": "Created Stroke / Fill shape layer", "status.creatingBackgroundBox": "Creating rounded rectangles...", "status.creatingStrokeFillLayer": "Creating Stroke / Fill shape layer...", "status.selectionUpdated": "Selection info updated.", "status.readingSelection": "Reading selection...", "status.noResponse": "No response from After Effects.", "status.colorPickerOpening": "Opening AE color picker...", "status.colorUpdated": "Color updated.", "status.colorUnchanged": "Color unchanged.", "status.defaultsRestored": "Defaults restored.", "status.motionSpeedUpdated": "Motion speed updated.", "status.backgroundRandomized": "Background randomized.", "status.backgroundDefaultsRestored": "Background defaults restored.", "status.proceduralBackgroundSeedRegenerated": "Procedural background seed regenerated.", "status.proceduralAppearanceDefaultsRestored": "Procedural appearance defaults restored.", "status.homeEditing": "Home editing. Drag tools to reorder.", "status.homeLayoutSaved": "Home layout saved.", "status.addingShape": "Adding {label}...", "status.addedShape": "Added: {label}", "status.noSelectedLayers": "No selected layers.", "status.oneLayerSelected": "1 layer selected", "status.multipleLayersSelected": "{count} layers selected", "status.unableReadSelection": "Unable to read selection.", "selection.noShapeTarget": "No shape target", "selection.shapeTarget": "Shape target", "selection.layerCount": "{count} layer(s)" }, "zh-CN": { "reference.launch": "UI 参考页 · 0.3.13-B", "reference.title": "UI 参考页", "reference.fixture": "隔离模拟 · 无 Provider、Host 或资产写入", "reference.exit": "退出参考页", "reference.confirm": "离开当前页面？", "reference.unsaved": "当前页有未保存的模拟修改。请保存会话内检查点或丢弃后离开。", "reference.conversation": "当前会话非空。是否关闭并丢弃模拟内容？", "reference.stay": "留在当前页", "reference.discard": "丢弃并离开", "reference.save": "保存会话内检查点", "reference.reset": "重置预览", "reference.failSave": "模拟保存失败", "reference.state": "捕获的模拟状态", "reference.saved": "会话内检查点已保存 · persisted: false", "reference.failed": "保存失败 · 草稿已保留", "reference.unsavedStatus": "模拟修改未保存 · persisted: false", "reference.conversationStatus": "模拟会话 · persisted: false", "reference.fixturePalette": "模拟调色板", "reference.ui.theme": "主题", "reference.ui.dark": "深色", "reference.ui.light": "浅色", "reference.ui.language": "语言", "reference.ui.uIScale": "界面缩放", "reference.ui.referencePages": "参考页面", "reference.ui.globalSettings": "全局设置", "reference.ui.registryControls": "Registry 控件", "reference.ui.paletteCurve": "调色板 / 曲线", "reference.ui.palette": "调色板", "reference.ui.curve": "曲线", "reference.ui.gradient": "+ 渐变", "reference.ui.new": "+ 新建", "reference.ui.point": "+ 节点", "reference.ui.solid": "+ 纯色", "reference.ui.stop": "+ 色标", "reference.ui.aEDataExport": "AE 数据与导出", "reference.ui.aEKeyframeData": "AE 关键帧数据", "reference.ui.add": "添加", "reference.ui.addASolidColorOrAGradient": "添加纯色或渐变。", "reference.ui.addYourFirstColor": "添加第一个颜色", "reference.ui.allColors": "全部颜色", "reference.ui.allGroups": "全部分组", "reference.ui.apply": "应用", "reference.ui.cancel": "取消", "reference.ui.cancelColorEdit": "取消颜色编辑", "reference.ui.chooseAPreviewContextAbove": "请在上方选择预览上下文", "reference.ui.chooseASelectionContextAbove": "请在上方选择模拟选区。", "reference.ui.chooseASolidForTheAccentColor": "请选择纯色作为强调色", "reference.ui.chooseAnAxisThenDragInTheColorFieldArrowKeysFineTuneShiftMakesLargerSteps": "选择轴后拖动色域。方向键微调，Shift 加大步长。", "reference.ui.clearFilters": "清除筛选", "reference.ui.colorFieldArrowKeysToAdjustShiftForLargerSteps": "色域；方向键调整，Shift 加大步长", "reference.ui.colorPicker": "颜色选择器", "reference.ui.colorPlaneAxis": "色域固定轴", "reference.ui.colorStops": "颜色色标", "reference.ui.copy": "复制", "reference.ui.copyHEX": "复制 HEX", "reference.ui.createACurveToBegin": "创建曲线以开始编辑。", "reference.ui.createAPaletteToBegin": "创建调色板以开始编辑。", "reference.ui.current": "当前", "reference.ui.curveJSON": "曲线 JSON", "reference.ui.curveEditor": "曲线编辑器", "reference.ui.curveGroup": "曲线分组", "reference.ui.curveLibrary": "曲线库", "reference.ui.curveName": "曲线名称", "reference.ui.curveView": "曲线视图", "reference.ui.curvesImported": "曲线已导入。", "reference.ui.defaultAppearance": "默认外观", "reference.ui.defaultSpring": "默认弹簧", "reference.ui.delete": "删除", "reference.ui.deleteGroupKeepPalettes": "删除分组并保留调色板", "reference.ui.deletePalette": "删除调色板", "reference.ui.deleteSlot": "删除色槽", "reference.ui.disabled": "已禁用", "reference.ui.dragAPointOrItsHandlesArrowKeysFineTuneShiftMovesFasterSplitASegmentToAddAPointWithoutChangingItsShape": "拖动节点或手柄。方向键微调，Shift 加大步长。拆分曲线段可在保持形状的同时添加节点。", "reference.ui.dragOrUseArrowKeys": "拖动或使用方向键", "reference.ui.dragToResizeUpDownToAdjust": "拖动改变高度 · 上 / 下键调整", "reference.ui.duplicate": "创建副本", "reference.ui.duplicatePalette": "创建调色板副本", "reference.ui.duplicateSlot": "创建色槽副本", "reference.ui.duration": "时长", "reference.ui.editableTimeAndValueCurve": "可编辑的时间与数值曲线", "reference.ui.endValue": "结束值", "reference.ui.exportDownloaded": "导出已下载。", "reference.ui.exportLibrary": "导出库", "reference.ui.exportPaintData": "导出填色数据", "reference.ui.filterByGroup": "按分组筛选", "reference.ui.filterByPaintType": "按填色类型筛选", "reference.ui.filterCurvesByGroup": "按分组筛选曲线", "reference.ui.findAControl": "查找控件", "reference.ui.findAControl70": "查找控件……", "reference.ui.flatTangents": "水平切线", "reference.ui.gradientStopChannel": "渐变色标通道", "reference.ui.gradientStops": "渐变色标", "reference.ui.groupRemovedItsPalettesAreNowUngrouped": "分组已删除，其中的调色板已移至未分组。", "reference.ui.groups": "分组", "reference.ui.hEXColor": "HEX 颜色", "reference.ui.hEXCopied": "已复制 HEX。", "reference.ui.handleCoordinates": "手柄坐标", "reference.ui.importCurves": "导入曲线", "reference.ui.importPalettes": "导入调色板", "reference.ui.library": "库", "reference.ui.linearGradient": "线性渐变", "reference.ui.localIllustrationNoChangesToAfterEffects": "局部模拟预览 · 不修改 After Effects", "reference.ui.moveEarlier": "前移", "reference.ui.moveLater": "后移", "reference.ui.moveSlotEarlier": "前移色槽", "reference.ui.moveSlotLater": "后移色槽", "reference.ui.newCurveGroup": "新建曲线分组", "reference.ui.newGroupName": "新分组名称", "reference.ui.noMatchingControlsTryAnotherSearch": "未找到匹配控件，请更换搜索词。", "reference.ui.noMatchingCurves": "未找到匹配曲线。", "reference.ui.notApplied": "尚未应用", "reference.ui.opacity": "不透明度", "reference.ui.opacityIsControlledByTheGradientSOpacityStops": "不透明度由渐变的不透明度色标控制。", "reference.ui.opacityStops": "不透明度色标", "reference.ui.opacityValue": "不透明度数值", "reference.ui.openAComposition": "打开合成", "reference.ui.openColorPicker": "打开颜色选择器", "reference.ui.openStopColorPicker": "打开色标颜色选择器", "reference.ui.original": "原始", "reference.ui.outgoingInterpolation": "出段插值方式", "reference.ui.overlay": "叠加", "reference.ui.overlayValueAndSpeedCurves": "叠加数值与速度曲线", "reference.ui.paintType": "填色类型", "reference.ui.paletteDeletedUndoIsAvailable": "调色板已删除，可撤销。", "reference.ui.paletteDuplicated": "已创建调色板副本。", "reference.ui.paletteEditor": "调色板编辑器", "reference.ui.paletteGroup": "调色板分组", "reference.ui.paletteLibrary": "调色板库", "reference.ui.paletteName": "调色板名称", "reference.ui.palettesImportedExistingPalettesWereKept": "已导入调色板，原有调色板保留。", "reference.ui.pick": "拾色", "reference.ui.pickAScreenColorEscToCancel": "拾取屏幕颜色 · Esc 取消", "reference.ui.pluginMotion": "插件界面动效", "reference.ui.positionGeometry": "位置与几何", "reference.ui.preview": "预览", "reference.ui.previewContext": "预览与上下文", "reference.ui.previewDurationInMilliseconds": "预览时长，单位毫秒", "reference.ui.previewResult": "预览结果", "reference.ui.previewSelection": "模拟选区", "reference.ui.previewTime": "预览时间", "reference.ui.radialGradient": "径向渐变", "reference.ui.readOnly": "只读", "reference.ui.reloadSaved": "恢复检查点", "reference.ui.remove": "移除", "reference.ui.reset": "重置", "reference.ui.resizeCurveHeight": "调整曲线高度", "reference.ui.restoreOriginalColor": "恢复原始颜色", "reference.ui.restoreThisToolSControls": "重置此工具的控件", "reference.ui.restored": "已恢复。", "reference.ui.retrySave": "重试保存", "reference.ui.reverse": "反转", "reference.ui.reverseIsAvailableForContinuousCurves": "反转仅适用于连续曲线", "reference.ui.searchCurves": "搜索曲线", "reference.ui.searchCurves135": "搜索曲线……", "reference.ui.searchPalettesOrHEX": "搜索调色板或 HEX……", "reference.ui.searchPalettesSlotsOrHEX": "搜索调色板、色槽或 HEX", "reference.ui.selectAndCopyTheHEXValue": "请选择并复制 HEX 值。", "reference.ui.selectTheHEXFieldToCopyThisColor": "请选择 HEX 字段以复制此颜色。", "reference.ui.selectedCurvePoint": "选中的曲线节点", "reference.ui.shapeIllustration": "形状示意", "reference.ui.slotName": "色槽名称", "reference.ui.solid143": "纯色", "reference.ui.speedValueTime": "速度 · 数值变化 / 时间变化", "reference.ui.startValue": "起始值", "reference.ui.temporalDataForAScalarPropertyAEHostIntegrationIsAFutureStep": "标量属性的时间数据；本页未接入 AE 执行。", "reference.ui.thisColorChangedElsewhereReopenThePickerToEditItsLatestValue": "此颜色已在其他位置更改，请重新打开颜色选择器。", "reference.ui.thisCurveChangedElsewhereYourDragWasCancelled": "此曲线已在其他位置更改，本次拖动已取消。", "reference.ui.thisCurveChangedElsewhereReopenItBeforeEditing": "此曲线已在其他位置更改，请重新打开后编辑。", "reference.ui.time": "时间 →", "reference.ui.toolLanguage": "工具语言", "reference.ui.tryAgain": "重试", "reference.ui.undo": "撤销", "reference.ui.ungrouped": "未分组", "reference.ui.useAsAccent": "用作强调色", "reference.ui.useForUIMotion": "用于界面动效", "reference.ui.useForToolIcons": "用于工具图标", "reference.ui.useInVela": "在 Vela 中使用", "reference.ui.usesThisCurveWithADurationUpTo3000Ms": "界面动效使用此曲线，时长最多为 3000 毫秒。", "reference.ui.value": "数值", "reference.ui.speed": "速度", "reference.ui.withGradients": "包含渐变", "reference.ui.withSolids": "包含纯色", "reference.ui.library164": "‹ 返回库", "reference.ui.opacity165": "不透明度 %", "reference.ui.position": "位置 %", "reference.ui.startX": "起点 X %", "reference.ui.startY": "起点 Y %", "reference.ui.endX": "终点 X %", "reference.ui.endY": "终点 Y %", "reference.ui.highlight": "高光位置 %", "reference.ui.highlightAngle": "高光角度", "reference.ui.angle": "角度", "reference.ui.radius": "半径", "reference.ui.gradientAngle": "渐变角度", "reference.ui.radialRadius": "径向半径", "reference.ui.time177": "时间 %", "reference.ui.value178": "数值 %", "reference.ui.inTime": "入手柄 · 时间 %", "reference.ui.inValue": "入手柄 · 数值 %", "reference.ui.outTime": "出手柄 · 时间 %", "reference.ui.outValue": "出手柄 · 数值 %", "reference.ui.linear": "线性", "reference.ui.hold": "保持", "reference.ui.pause": "暂停", "reference.ui.replay": "重播", "reference.ui.loadingCurves": "正在加载曲线……", "reference.ui.loadingYourPalettes": "正在加载调色板……", "reference.ui.loading": "正在加载……", "reference.ui.saved": "已保存", "reference.ui.saving": "正在保存……", "reference.ui.unsavedChanges": "未保存修改", "reference.ui.saveUnavailable": "保存不可用", "reference.ui.saveConflict": "保存冲突", "reference.ui.checkInput": "请检查输入", "reference.ui.editingCurve": "正在编辑曲线……", "reference.ui.interactivePreviewAfterEffectsIsNotConnected": "交互模拟预览 · 未连接 After Effects", "reference.ui.screenPickingIsnTAvailableInThisBrowserUseTheColorFieldOrEnterHEX": "此浏览器不支持屏幕拾色，请使用色域或输入 HEX。", "reference.ui.pickAnyScreenColorEscCancelsSampling": "拾取屏幕颜色；Esc 取消。", "reference.ui.samplingCancelledYourDraftIsKept": "拾色已取消，草稿已保留。", "reference.ui.screenPickingFailedTryAgainOrEnterHEX": "屏幕拾色失败，请重试或输入 HEX。", "reference.ui.enterAValidNumber": "请输入有效数值。", "reference.ui.previousValueRestored": " 已恢复原值。", "reference.ui.thisEditHasNotBeenApplied": " 此修改尚未应用。", "reference.ui.composition": "合成", "reference.ui.selectedLayers": "已选图层", "reference.ui.noComposition": "无合成", "reference.ui.noSelection": "未选择图层", "reference.ui.3TextLayers": "3 个文本图层", "reference.ui.1ShapeLayer": "1 个形状图层", "reference.ui.nodeParameters": "节点参数", "reference.ui.incomingHandle": "入手柄", "reference.ui.outgoingHandle": "出手柄", "reference.ui.previewSettings": "预览设置", "reference.ui.selectedElement": "当前选中", "reference.ui.node": "节点", "reference.ui.timePositionWithinTheCurve0100": "在整条曲线中的时间位置；0–100%。", "reference.ui.valueRelativeToTheUnitIntervalValuesMayOvershoot": "相对于单位区间的数值；允许超出 0–100%。", "reference.ui.endpointsAreFixedAt00And100100": "端点固定为 (0%, 0%) 和 (100%, 100%)。", "reference.ui.noIncomingSegmentAtTheFirstNode": "首节点没有入段。", "reference.ui.noOutgoingSegmentAtTheLastNode": "末节点没有出段。", "reference.ui.handlesApplyOnlyToBZierSegmentsChooseBZierToEdit": "手柄仅适用于贝塞尔曲线段，请先选择贝塞尔插值。", "reference.ui.timeIsBoundedByTheAdjacentNodesValueRange400500": "时间限制在相邻节点之间；数值范围为 −400–500%。", "reference.ui.durationAffectsPreviewPlaybackNotAEKeyframes": "时长仅影响预览播放，不修改 AE 关键帧。", "reference.ui.thisControlsTheReferenceUIMotionOnlyItDoesNotExecuteACurveInAE": "仅控制参考页界面动效，不在 AE 执行曲线。", "reference.ui.ready": "就绪", "reference.ui.unavailable": "不可用", "reference.ui.6ShapeLayers": "6 个形状图层", "reference.ui.existingComponent": "已有组件", "reference.ui.buildWithIntention": "用心构建", "reference.ui.makeItMove": "让创意动起来", "reference.ui.madeInLomond": "由 Lomond 制作", "reference.ui.previewContextChanged": "模拟上下文已切换", "reference.ui.controlsRestoredToSourceDefaults": "控件已恢复源默认值", "reference.ui.running": "正在运行……", "reference.ui.completeInspectTheResultBelow": "已完成，请查看下方结果。", "reference.ui.actionFailedCheckTheContextAndTryAgain": "动作失败，请检查上下文后重试。", "reference.ui.slots": "色槽", "reference.ui.channels": "通道", "reference.ui.hue": "色相", "reference.ui.saturation": "饱和度", "reference.ui.brightness": "明度", "reference.ui.red": "红", "reference.ui.green": "绿", "reference.ui.blue": "蓝", "reference.ui.color": "颜色", "reference.ui.offsetX": "水平偏移", "reference.ui.offsetY": "垂直偏移", "reference.ui.blur": "模糊半径", "reference.ui.spread": "扩展半径", "reference.ui.color251": "颜色", "reference.ui.alpha": "不透明度", "reference.ui.previewField": "预览字段", "reference.ui.enterAValueFromMinToMaxUsingTheFieldStep": "请输入 {min} 至 {max} 之间的数值，并遵循字段步长。", "reference.ui.countCurves": "{count} 条曲线", "reference.ui.countPalettes": "{count} 个调色板", "reference.ui.countStops": "{count} 个色标", "reference.ui.countSlots": "{count} 个色槽", "reference.ui.renameNameGroup": "重命名分组 {name}", "reference.ui.deleteNameGroupKeepItsPalettes": "删除分组 {name} 并保留调色板", "reference.ui.renameName": "重命名 {name}", "reference.ui.deleteNameGroupKeepCurves": "删除分组 {name} 并保留曲线", "reference.ui.channelStopAtPercentPercent": "{channel}色标，位置 {percent}%", "reference.ui.axisAxis": "{axis}轴", "reference.ui.channelValue": "{channel}数值", "reference.ui.holdChannelConstantInThePlane": "固定{channel}，调整其余通道", "reference.ui.colorPickerTitle": "颜色选择器：{title}", "reference.ui.timeTimeValueValue": "时间 {time}%，数值 {value}%", "reference.ui.fixedEndpoint": "；固定端点", "reference.ui.leftRightAdjustTimeUpDownAdjustValue": "；左 / 右调整时间，上 / 下调整数值", "reference.ui.kindHandleForPointIndex": "节点 {index} 的{kind}手柄", "reference.ui.pointIndex": "节点 {index}", "reference.ui.incoming": "入", "reference.ui.outgoing": "出", "reference.ui.controlPointIndexXXYY": "控制点 {index}：X {x}，Y {y}", "reference.ui.arrowKeysAdjustShiftForLargerSteps": "；方向键调整，Shift 加大步长", "reference.ui.kindSpeedSpeedInfluenceInfluence": "{kind}：速度 {speed}，影响 {influence}%", "reference.ui.kindSpeedSpeedUpAndDownArrowsAdjustSpeed": "{kind}速度 {speed}；上 / 下调整速度", "reference.ui.valueFocused": "数值视图", "reference.ui.speedFocused": "速度视图", "reference.ui.valueAndSpeedOverlay": "，叠加数值与速度", "reference.ui.influenceSpeed": "↔ 影响 · ↕ 速度", "reference.ui.dragHandlesToShapeTheCurve": "拖动手柄调整曲线", "reference.ui.fixtureSaveFailedYourDraftIsRetained": "模拟保存失败，草稿已保留。", "reference.ui.enterA6DigitHEXColorOr8DigitsWithOpacity": "请输入 6 位 HEX 颜色，或包含不透明度的 8 位值。", "reference.ui.enterA6DigitHEXColor": "请输入 6 位 HEX 颜色。", "reference.ui.enterASixDigitHEXColor": "请输入 6 位 HEX 颜色。", "reference.ui.invalidColorChannel": "颜色通道无效。", "reference.ui.aGradientCanHaveUpTo32StopsPerChannel": "渐变每个通道最多支持 32 个色标。", "reference.ui.invalidOrDuplicateIdentity": "标识无效或重复。", "reference.ui.namesMustContain180Characters": "名称必须包含 1–80 个字符。", "reference.ui.colorOrGeometryValueIsOutsideItsRange": "颜色或几何值超出范围。", "reference.ui.invalidRGBColor": "RGB 颜色无效。", "reference.ui.unsupportedPaletteLibrary": "不支持此调色板库。", "reference.ui.paletteGroupDoesNotExist": "调色板分组不存在。", "reference.ui.aPaletteSupportsUpTo64Slots": "每个调色板最多支持 64 个色槽。", "reference.ui.unsupportedColorSpace": "不支持此色彩空间。", "reference.ui.unsupportedPaintType": "不支持此填色类型。", "reference.ui.eachGradientChannelNeeds232Stops": "渐变每个通道需要 2–32 个色标。", "reference.ui.invalidGradientPoint": "渐变点无效。", "reference.ui.gradientStartAndEndMustDiffer": "渐变起点与终点必须不同。", "reference.ui.shapeDimensionsMustBePositive": "形状尺寸必须为正值。", "reference.ui.invalidOrDuplicateCurveIdentity": "曲线标识无效或重复。", "reference.ui.useANameOf180Characters": "名称须为 1–80 个字符。", "reference.ui.curveCoordinateIsOutsideItsRange": "曲线坐标超出范围。", "reference.ui.unsupportedCurveLibrary": "不支持此曲线库。", "reference.ui.curveGroupDoesNotExist": "曲线分组不存在。", "reference.ui.invalidCurveTags": "曲线标签无效。", "reference.ui.use2128CurvePoints": "曲线须包含 2–128 个节点。", "reference.ui.pointTimesMustIncrease": "节点时间须递增。", "reference.ui.unknownInterpolation": "未知插值方式。", "reference.ui.invalidControlHandle": "控制手柄无效。", "reference.ui.curveEndpointsMustBe00And11": "曲线端点须为 (0,0) 和 (1,1)。", "reference.ui.aCurveSupportsUpTo128Points": "曲线最多支持 128 个节点。", "reference.ui.chooseATimeInsideThisSegment": "请选择此曲线段内部的时间。", "reference.ui.keepTheFirstAndLastPoints": "必须保留首节点与末节点。", "reference.ui.reverseIsAvailableForContinuousCurves317": "反转仅适用于连续曲线。", "reference.ui.useFiniteValuesAndAPositiveDuration": "请输入有限数值和正时长。", "reference.ui.uISettingsAreStillLoading": "界面设置仍在加载。", "reference.ui.chooseAnExistingCurve": "请选择已有曲线。", "reference.ui.unknownAppearanceRole": "未知外观角色。", "reference.ui.chooseAnExistingColorSlot": "请选择已有色槽。", "reference.ui.accentColorsUseASolidSlot": "强调色须使用纯色色槽。", "reference.ui.invalidUIMotionSettings": "界面动效设置无效。", "reference.ui.invalidPaintReference": "填色引用无效。", "reference.ui.previewSetup": "预览设置", "reference.ui.sampleSizesOnce4sThenOpenThePicker": "一次尺寸采样（4 秒）；点击后打开颜色弹层", "reference.ui.sizeSamplingEvidence": "尺寸采样证据", "reference.ui.actionFailureFixture": "动作失败模拟", "reference.ui.labPaintModelPaletteV2AdapterPendingSessionDataOnly": "Lab Paint 模型 · Palette v2 适配待完成；仅会话内数据", "reference.ui.actualAppearanceDesignTuningDefinitionsIsolatedPreview": "实际 Appearance / Design Tuning 定义 · 隔离预览", "reference.ui.referenceClosed": "参考页已关闭", "reference.ui.sessionFixturesDisposedCloseThisStandaloneWindowOrReturnToSettings": "会话模拟实例已释放。请关闭独立窗口或返回设置页。", "reference.ui.applyOrCancelTheActiveEditFirst": "请先应用或取消当前编辑。", "reference.ui.liveAppearancePreview": "外观实时预览", "reference.ui.longSupportingTextRemainsReadableInACompactFieldGroup": "紧凑字段分组中的长说明仍应清晰可读。", "reference.ui.previewMotion": "预览动效", "reference.ui.selectedFocusError": "已选择 · 焦点 · 错误", "reference.ui.fixtureLibraryOnlyImportExportDoesNotAccessProductionAssets": "仅使用模拟库；本参考页不导入或导出生产资产。", "reference.ui.fixtureOnlyNoAEExecutionOrProductionAssetTransfer": "仅模拟数据，不执行 AE 操作或迁移生产资产。", "reference.ui.unavailableInTheSelectedFixtureContext": "在所选模拟上下文中不可用。", "reference.ui.setLayerOpacity": "调整图层不透明度", "reference.ui.renameLayer": "重命名图层", "reference.ui.additionalFixtureEvidence": "新增模拟证据。", "reference.ui.commandIsolatedSelectACapturedStateToInspectItsFacts": "命令已隔离。请用状态选择器查看捕获的事实。", "reference.ui.appendLongEvidence": "追加长证据", "reference.ui.velaConversation": "Vela 会话", "reference.ui.isolatedRuntimeFixture": "隔离 Runtime 模拟", "reference.ui.conversationMessages": "会话消息", "reference.ui.capturedState": "捕获状态", "reference.ui.onlyTheCurrentStepIsReviewedCompletedWorkRemainsAFactAfterRejectionOrFailure": "批准范围仅限当前步；后续拒绝或失败不会撤销已完成事实。", "reference.ui.draftProviderDisabled": "起草 · Provider 未启用", "reference.ui.messageVela": "给 Vela 的消息", "reference.ui.askVelaOrDescribeAnEdit": "向 Vela 提问或描述修改……", "reference.ui.reject": "拒绝", "reference.ui.approve": "批准", "reference.ui.enterNewLineCtrlCmdEnterFixtureSend": "Enter 换行 · Ctrl/Cmd+Enter 模拟发送", "reference.ui.review": "审阅", "reference.ui.currentStep": "当前步", "reference.ui.beforeProposed": "原值 → 提议值", "reference.ui.reviewIdentityAndTarget": "Review 身份与目标", "reference.ui.revisionScope": "修订 / 范围", "reference.ui.compositionLayer": "合成 / 图层", "reference.ui.completed": "完成", "reference.ui.completion": "完成情况", "reference.ui.committed": "已提交变更", "reference.ui.expectedObserved": "期望 / 观察值", "reference.ui.committedChangesRemainNoAutomaticRollback": "已提交变更保留，不会自动回滚。", "reference.ui.runtimeProjectionAndProvenance": "Runtime 投影与证据来源", "reference.ui.storedInThisFixtureConversationOnly": "仅加入当前模拟会话。", "reference.ui.sizeEvidenceReadySelectTextToCopy": "尺寸采样完成 · 选中文本复制", "reference.ui.awaitingApproval": "待批准", "reference.ui.executing": "执行中", "reference.ui.partiallyCompleted": "部分完成", "reference.ui.rejected": "已拒绝", "reference.ui.cancelled": "已取消", "reference.ui.failed": "失败", "reference.ui.familyAxes": "{family} 色彩轴", "reference.ui.twoDimensionalColorField": "二维色域", "reference.ui.slider": "滑块", "reference.ui.editTitle": "编辑{title}", "reference.ui.enableTitle": "启用{title}", "reference.ui.noMatchingPalettes": "未找到匹配调色板。", "reference.ui.noColorsYet": "尚无颜色。", "reference.ui.sizeDiagnostics": "尺寸诊断", "reference.ui.iCanApplyThisStepAfterYourApproval": "批准后可应用当前步骤。", "reference.ui.reviewTheProposedChangeAbove": "请审阅上方提议的修改", "reference.ui.capturedExecutionFactsAreShownBelow": "以下为捕获的执行事实。", "reference.ui.reviewID": "Review 标识", "reference.ui.appliedToThePluginAppearance": "已应用到参考页外观。", "reference.ui.defaultAppearanceRestored": "已恢复默认外观。", "reference.ui.defaultSpringRestored": "已恢复默认弹簧。", "reference.ui.thisCurveNowDrivesPluginMotion": "此曲线现用于参考页界面动效。", "reference.ui.createAPalette": "创建调色板", "reference.ui.yourLibraryIsEmpty": "库中暂无内容。", "reference.ui.previewInterruptedReadyToRetry": "预览已中断 · 可重试", "reference.ui.editSlotInPalette": "编辑 {palette} 中的 {slot}", "reference.ui.duplicateName": "创建 {name} 的副本", "reference.ui.deleteName": "删除 {name}", "reference.ui.selectedLayers400": "已选图层", "reference.ui.chooseAFileSmallerThan2MB": "请选择小于 2 MB 的文件。", "reference.ui.chooseALibrarySmallerThan2MB": "请选择小于 2 MB 的库。", "reference.ui.exportedKeyframesVeryShortHandlesUseSampledSegments": "关键帧已导出；极短手柄使用采样曲线段。", "reference.ui.exportedTemporalKeyframeData": "已导出时间关键帧数据。", "reference.ui.surfaceTransitionIdentityHandoffRemainsUnresolved": "表面过渡的身份交接尚未解决。", "reference.ui.editSelectedElement": "编辑选中元素参数", "reference.ui.backToCurve": "返回曲线图", "reference.ui.untitledCurve": "未命名曲线", "reference.ui.untitledPalette": "未命名调色板", "reference.ui.newColor": "新颜色", "reference.ui.newGradient": "新渐变", "reference.ui.selectedLayer": "当前图层", "reference.ui.curveType": "曲线类型", "reference.ui.curveTypeStructureMotion": "曲线类型、结构与界面动效", "app.title": "Lomond Cabinet", "common.home": "主页", "common.back": "返回", "common.done": "完成", "common.close": "关闭", "common.editHome": "编辑主页", "common.settings": "设置", "settings.navigation.appearance": "外观", "settings.navigation.general": "通用", "settings.navigation.interface": "界面", "settings.navigation.background": "背景", "settings.navigation.advanced": "高级", "settings.navigation.developer": "开发者", "settings.developer.labs": "实验室", "settings.developer.homeCalibration": "主页校准", "settings.appearance.title": "界面外观", "settings.appearance.advanced.title": "高级外观设置", "settings.appearance.inherited": "使用默认 / 继承", "settings.appearance.overridden": "已覆盖", "settings.appearance.reset": "重置", "settings.designTuning.title": "设计调校", "settings.designTuning.description": "开发者校准覆盖。规范默认值仍由其源头拥有。", "settings.designTuning.motion.title": "动效", "settings.designTuning.motion.curves": "动效曲线", "settings.designTuning.motion.durations": "动效时长", "settings.designTuning.motion.curve.enter": "进入", "settings.designTuning.motion.curve.exit": "退出", "settings.designTuning.motion.curve.standard": "标准", "settings.designTuning.motion.curve.press": "按压", "settings.designTuning.motion.duration.spatialExpand": "空间展开", "settings.designTuning.motion.duration.spatialContract": "空间收缩", "settings.designTuning.motion.duration.viewContentEnter": "视图内容进入", "settings.designTuning.motion.duration.viewContentExit": "视图内容退出", "settings.designTuning.motion.duration.actionFeedback": "操作反馈", "settings.designTuning.motion.duration.actionPress": "操作按压", "settings.designTuning.motion.duration.surfaceState": "表面状态", "settings.designTuning.motion.duration.structuralCollapse": "结构收起", "settings.designTuning.motion.duration.homeHandoffRecede": "Home 交接退场", "settings.designTuning.motion.duration.homeHandoffRestore": "Home 交接恢复", "settings.designTuning.motion.duration.spatialIdentity": "空间身份过渡", "settings.designTuning.motion.duration.toolIdentityOpen": "工具身份展开", "settings.designTuning.motion.duration.paletteEnter": "色板进入", "settings.designTuning.motion.duration.paletteExit": "色板退出", "settings.designTuning.motion.duration.dragSettle": "拖拽安定", "settings.designTuning.default": "默认", "settings.designTuning.overridden": "已覆盖", "settings.designTuning.resetMotion": "重置动效", "settings.designTuning.promotionEvidence": "采纳依据", "settings.designTuning.curve.progress": "进度 / 数值", "settings.designTuning.curve.speed": "速度", "settings.designTuning.curve.speedHint": "拖动速度手柄时按住 Shift，可仅调整影响比例。", "settings.designTuning.shadow.offsetX": "X 偏移", "settings.designTuning.shadow.offsetY": "Y 偏移", "settings.designTuning.shadow.blur": "模糊", "settings.designTuning.shadow.spread": "扩散", "settings.designTuning.shadow.color": "颜色", "settings.designTuning.shadow.alpha": "不透明度", "settings.designTuning.spacing.title": "间距", "settings.designTuning.radius.title": "圆角", "settings.designTuning.controls.title": "控件与几何", "settings.designTuning.elevation.title": "视觉层级 / 阴影", "settings.designTuning.text.title": "文本颜色 + Alpha", "settings.designTuning.surface.title": "表面颜色 + Alpha", "settings.designTuning.border.title": "边框颜色 + Alpha", "settings.designTuning.resetDomain": "重置当前域", "settings.designTuning.resetAll": "重置全部设计调校", "settings.designTuning.existingAppearance.title": "现有外观 / 用户参数", "settings.designTuning.authority.userAppearance": "权威源：用户外观。这些编辑器不写入设计调校覆盖。", "settings.designTuning.protected.surface-transition": "受 Surface Transition 契约保护", "settings.designTuning.protected.compound-shadow": "复合阴影暂为只读", "settings.designTuning.parameter.spacing.surface.edge": "表面边缘", "settings.designTuning.parameter.spacing.card.inset": "卡片内边距", "settings.designTuning.parameter.spacing.content.inlineInset": "内容行内边距", "settings.designTuning.parameter.spacing.content.blockInset": "内容块轴内边距", "settings.designTuning.parameter.spacing.content.blockInset.description": "内容边界与文本之间的上下内边距。", "settings.designTuning.parameter.spacing.section.stack": "分区堆叠间距", "settings.designTuning.parameter.spacing.section.headerContent": "分区标题与内容", "settings.designTuning.parameter.spacing.field.copy": "字段文本间距", "settings.designTuning.parameter.spacing.field.block": "字段块间距", "settings.designTuning.parameter.spacing.control.inline": "行内控件间距", "settings.designTuning.parameter.spacing.settings.fieldControl": "设置字段与控件", "settings.designTuning.parameter.spacing.registry.cardInset": "Registry 卡片内边距", "settings.designTuning.parameter.spacing.registry.introContent": "Registry 导语与内容", "settings.designTuning.parameter.spacing.registry.sectionHeaderContent": "Registry 分区标题与内容", "settings.designTuning.parameter.spacing.registry.sectionCopy": "Registry 分区文本间距", "settings.designTuning.parameter.spacing.registry.fieldCopy": "Registry 字段文本间距", "settings.designTuning.parameter.spacing.registry.fieldControl": "Registry 字段与控件", "settings.designTuning.parameter.spacing.palette.fieldControl": "色板字段与控件", "settings.designTuning.parameter.spacing.home.toolGrid": "Home 工具网格间距", "settings.designTuning.parameter.spacing.home.majorStack": "Home 主堆叠间距", "settings.designTuning.parameter.spacing.home.cardTitle": "Home 卡片标题间距", "settings.designTuning.parameter.radius.primaryWorkSurface": "主工作表面圆角", "settings.designTuning.parameter.radius.nestedSurface": "嵌套表面圆角", "settings.designTuning.parameter.radius.editableControl": "可编辑控件圆角", "settings.designTuning.parameter.radius.sectionCard": "分区卡片圆角", "settings.designTuning.parameter.radius.homeTile": "Home 瓦片圆角", "settings.designTuning.parameter.radius.homeIcon": "Home 图标圆角", "settings.designTuning.parameter.geometry.control.height": "控件高度", "settings.designTuning.parameter.geometry.button.height": "按钮高度", "settings.designTuning.parameter.geometry.button.horizontalPadding": "按钮水平内边距", "settings.designTuning.parameter.componentOptics.sliderThumbShadow": "滑块手柄光学阴影", "settings.designTuning.parameter.componentOptics.sliderThumbShadow.description": "控制共享滑块手柄与轨道或背景之间用于视觉分离的组件内部阴影。", "settings.designTuning.parameter.componentOptics.switchThumbShadow": "开关手柄光学阴影", "settings.designTuning.parameter.componentOptics.switchThumbShadow.description": "控制共享开关手柄与轨道或背景之间用于视觉分离的组件内部阴影。", "settings.designTuning.parameter.elevation.surfaceShell": "表面外壳层级", "settings.designTuning.parameter.elevation.surfaceShell.description": "控制工具详情主工作表面的阴影深度。", "settings.designTuning.parameter.elevation.informationSurface": "信息表面层级", "settings.designTuning.parameter.elevation.informationSurface.description": "控制只读工具说明与 Host 状态表面共享的阴影层级。", "settings.designTuning.parameter.elevation.primaryAction": "主要操作层级", "settings.designTuning.parameter.elevation.primaryAction.description": "控制主要操作按钮的阴影层级。", "settings.designTuning.parameter.elevation.utilityAction": "实用操作层级", "settings.designTuning.parameter.elevation.utilityAction.description": "控制返回、编辑主页、重试、Vela 设置、发送、取消、批准和拒绝等实用操作的基础阴影层级。", "settings.designTuning.parameter.elevation.floatingSurface": "浮动表面层级", "settings.designTuning.parameter.elevation.floatingSurface.description": "控制 Vela 设置和下拉菜单等临时浮动表面的阴影。", "settings.designTuning.parameter.elevation.floatingPicker": "浮动选择器层级", "settings.designTuning.parameter.elevation.floatingPicker.description": "控制 Registry 颜色选择器的阴影深度。", "settings.designTuning.parameter.elevation.actionContainer": "操作容器层级", "settings.designTuning.parameter.elevation.actionContainer.description": "控制承载工具操作按钮的浮动容器阴影。", "settings.designTuning.parameter.text.secondary": "次要文本", "settings.designTuning.parameter.text.tertiary": "三级文本", "settings.designTuning.parameter.surface.field": "字段表面", "settings.designTuning.parameter.surface.registryOption": "Registry 选项表面", "settings.designTuning.parameter.surface.conversation": "对话表面", "settings.designTuning.parameter.surface.utilityChrome": "工具栏表面", "settings.designTuning.parameter.surface.utilityAction": "工具操作表面", "settings.designTuning.parameter.surface.neutralAction": "中性操作表面", "settings.designTuning.parameter.surface.dangerAction": "危险操作表面", "settings.designTuning.parameter.border.separator": "分隔边框", "settings.designTuning.parameter.border.panel": "面板边框", "settings.designTuning.parameter.border.input": "输入框边框", "settings.appearance.percentageUnit": "%", "settings.appearance.typography.title": "字体排版", "settings.appearance.typography.subgroup.titles": "标题", "settings.appearance.typography.subgroup.content": "内容", "settings.appearance.typography.subgroup.code": "代码", "appearance.typography.titleSize.label": "标题大小", "appearance.typography.titleSize.description": "同时调整页面与表面标题，并保持它们的原有层级。", "appearance.typography.sectionTitleSize.label": "分区标题大小", "appearance.typography.sectionTitleSize.description": "独立调整分区标题，不影响页面与表面标题。", "appearance.typography.fieldLabelSize.label": "字段标签大小", "appearance.typography.fieldLabelSize.description": "调整语义字段标签，并保留各领域的字重强调。", "appearance.typography.bodySize.label": "正文大小", "appearance.typography.bodySize.description": "同时调整正文与控件文字。", "appearance.typography.supportingSize.label": "辅助文本大小", "appearance.typography.supportingSize.description": "调整辅助文本与派生的分类标记文字。", "appearance.typography.codeSize.label": "代码文本大小", "appearance.typography.codeSize.description": "独立调整代码文本与 Palette JSON，不跟随辅助文本。", "appearance.surface.panel.label": "面板表面", "appearance.text.primary.label": "主要文本", "appearance.text.secondary.label": "次要文本", "appearance.text.tertiary.label": "三级文本", "appearance.select.triggerSurface.label": "选择器触发面", "appearance.select.menuSurface.label": "选择器菜单面", "appearance.base.accent.label": "强调色", "appearance.base.accent.description": "贯穿界面的主强调色。", "appearance.base.canvas.label": "背景色", "appearance.base.canvas.description": "界面的基础背景底色。", "appearance.layout.scale.label": "界面缩放", "appearance.layout.scale.description": "按比例缩放界面间距与文字大小。", "appearance.motion.speed.label": "动画速度", "appearance.motion.speed.description": "调整界面动画的整体速度。", "appearance.surface.panel.description": "主工作表面使用的面板填充色。", "appearance.text.primary.description": "用于标题与强调的主要文本色。", "appearance.text.secondary.description": "用于支援文本的次要文本色，带部分透明度。", "appearance.text.tertiary.description": "用于淡化或不太突出文本的三级文本色。", "appearance.select.triggerSurface.description": "选择器触发器背后的填充色。", "appearance.select.menuSurface.description": "选择器弹出菜单背后的填充色。", "appearance.interaction.focusRing.label": "焦点圆环", "appearance.interaction.focusRing.description": "交互控件的焦点指示环颜色。", "appearance.interaction.focusBorder.label": "焦点边框", "appearance.interaction.focusBorder.description": "聚焦控件应用的边框颜色。", "appearance.interaction.hoverBorder.label": "悬停边框", "appearance.interaction.hoverBorder.description": "控件悬停时应用的边框颜色。", "appearance.interaction.hoverSurface.label": "悬停表面", "appearance.interaction.hoverSurface.description": "控件悬停时应用的填充色。", "appearance.interaction.selectedSurface.label": "选中表面", "appearance.interaction.selectedSurface.description": "用于选中选项或条目的填充色。", "appearance.interaction.selectedForeground.label": "选中前景", "appearance.interaction.selectedForeground.description": "用于选中条目的前景颜色。", "appearance.interaction.checkedSurface.label": "勾选表面", "appearance.interaction.checkedSurface.description": "用于勾选控件状态的填充色。", "appearance.action.primarySurface.label": "主要操作表面", "appearance.action.primarySurface.description": "主要操作的基础填充色。", "appearance.action.primaryHoverSurface.label": "主要操作悬停表面", "appearance.action.primaryHoverSurface.description": "主要操作的悬停填充色。", "appearance.action.primaryForeground.label": "主要操作前景", "appearance.action.primaryForeground.description": "主要操作的前景（内容）颜色。", "appearance.selection.indicatorSurface.label": "选择指示表面", "appearance.selection.indicatorSurface.description": "选择指示器的填充色。", "settings.sections.general": "通用", "settings.language.en": "English", "settings.language.zhCN": "简体中文", "common.global": "全局", "common.language": "语言", "common.apply": "应用", "common.create": "创建", "common.refresh": "刷新", "common.retry": "重试", "assets.notSaved": "更改未保存。请重试或还原已保存值后再离开。", "assets.restoreSaved": "还原已保存值", "assets.noSavedBaseline": "没有可靠的已保存值可供还原", "common.reset": "重置", "common.resetDefaults": "恢复默认值", "common.restoreDefaults": "恢复默认", "common.valuesReset": "已恢复默认值。", "common.saved": "已保存", "common.cancel": "取消", "common.ready": "就绪", "common.error": "错误", "common.unavailable": "不可用", "common.none": "无", "common.solid": "纯色", "common.gradient": "渐变", "common.enabled": "启用", "common.disabled": "禁用", "common.auto": "自动", "common.fixed": "固定", "common.left": "左对齐", "common.center": "居中", "common.right": "右对齐", "common.timeline": "时间线", "common.yPosition": "Y 位置", "common.xPosition": "X 位置", "common.rowMajor": "行优先", "common.fitBox": "适配框", "common.uniformHeight": "统一高度", "common.uniformWidth": "统一宽度", "common.registry": "注册信息", "common.parameters": "参数", "core.bezier.speedInfluenceHint": "Shift + 水平拖动：仅调整影响范围", "tools.moreTools.title": "更多工具", "tools.quickStack.title": "快速堆叠", "vela.surfaceLabel": "Vela", "vela.surfaceTranscriptIntro": "从本地模型开始与 Vela 对话。", "vela.surfaceReasoningActive": "正在思考…", "vela.surfaceReasoningResponse": "思考过程", "vela.surfaceReasoningCompleted": "输出流已结束", "vela.surfaceReasoningFailed": "输出流结束（出现问题）", "vela.surfaceReasoningCancelled": "输出流已取消", "vela.surfaceComposerPlaceholder": "输入给 Vela 的消息", "vela.surfaceComposerLabel": "Vela 消息", "vela.surfaceStatusSetup": "可以发送本地消息", "vela.surfaceStatusComposing": "正在编辑本地消息", "vela.surfaceStatusExperimentalUnavailable": "Provider 需手动选择加入后才可用", "vela.surfaceStatusExperimentalDisabled": "实验 Provider 已禁用", "vela.surfaceStatusExperimentalConfiguring": "请配置并确认实验 Provider", "vela.surfaceStatusExperimentalChecking": "正在检查已加载的本地模型", "vela.surfaceStatusEndpointInvalid": "本地 endpoint 无效", "vela.surfaceStatusReadinessNetworkFailed": "无法连接本地 LM Studio 服务器", "vela.surfaceStatusReadinessHttpFailed": "本地 LM Studio readiness 请求失败", "vela.surfaceStatusReadinessResponseInvalid": "本地 LM Studio 返回了无效 readiness 响应", "vela.surfaceStatusModelNotFound": "未找到配置的模型", "vela.surfaceStatusModelNotLoaded": "配置的模型未加载", "vela.surfaceExperimentalStatus": "实验性 · 未通过资格认证 · 需手动选择加入", "vela.surfaceSettings": "设置", "vela.surfaceResize": "调整 Vela 对话区域大小", "vela.conversationLabel": "对话 {n}", "vela.conversationSelect": "选择对话", "vela.conversationNew": "新建对话", "vela.conversationClose": "关闭对话", "vela.conversationRunning": "运行中", "vela.conversationOtherRunning": "另一对话正在运行", "vela.surfaceStoppingTask": "活动任务尚未收束，暂不能发送", "vela.conversationLimit": "最多 8 个对话，请先关闭一个。", "vela.conversationActiveClose": "完成或取消此对话后才能关闭", "vela.conversationLastClose": "至少保留一个对话", "vela.conversationOperationFailed": "对话操作未完成，请重试。", "vela.surfaceSend": "发送", "vela.surfaceCancel": "取消", "vela.surfaceStatusPending": "正在等待本地模型", "vela.surfaceStatusAwaitingContinuation": "已批准，等待继续处理", "vela.surfaceStatusCompleted": "已收到本地响应", "vela.surfaceStatusCancelled": "已取消本地请求", "vela.surfaceStatusBlocked": "本地操作需要授权", "vela.surfaceStatusContextStale": "上下文已变化，请重新操作", "vela.surfaceStatusFailed": "本地请求失败", "vela.surfaceStatusIntentRejected": "需要明确的不透明度修改请求", "vela.surfaceProviderError": "本地 Provider 错误", "vela.surfaceProviderNoDisplayableText": "本地模型未返回可显示的文本。", "vela.surfaceLocalProposalNotice": "已收到一个本地操作建议。\n当前对话区域暂不支持查看或执行该建议。", "vela.surfaceIntentRejected": "未检测到明确的不透明度修改请求。请说明要将当前图层的不透明度设为多少（0–100%）。", "vela.surfaceIntentTargetMismatch": "本地 proposal 与本轮请求的不透明度不一致。未创建任何操作。", "vela.surfaceContextUnavailable": "无法读取可用的 AE 上下文。请打开合成并选中至少一个图层后重试。", "vela.surfaceNoActionableTarget": "当前没有可操作的目标。请在 AE 中选择一个图层后重新发送请求。", "vela.surfaceProviderConnection": "无法连接 LM Studio。请启动本地服务器并确认其可用后重试。", "vela.surfaceProviderTimeout": "本地模型响应超时。请检查 LM Studio 后重试。", "vela.surfaceProviderCancelled": "已取消本地请求。", "vela.surfaceProviderResponse": "本地模型返回了无法使用的响应。请重试。", "vela.surfaceProviderConfiguration": "本地模型配置不可用。请检查 LM Studio 后重试。", "vela.surfaceRuntimeUnavailable": "Vela 暂时不可用。请重新打开面板后重试。", "vela.surfaceReviewRequired": "当前操作需要授权后才能执行。请允许下一次不透明度修改，然后发起新请求。", "vela.surfacePermissionDenied": "当前操作未获授权，且未执行。", "vela.surfaceGenericError": "本地请求未能完成。请重试。", "vela.surfaceReview": "查看", "vela.reviewTargetIds": "合成 ID：{comp}\n图层 ID：{layer}", "vela.reviewCurrentStepScope": "仅批准本步骤（{current}/{total}）。本次批准不授权后续步骤。", "vela.reviewUnavailable": "无法核实本次 Review 捕获的目标或变化，已阻断批准。请拒绝后重新发起 Review。", "vela.reviewUnavailableValue": "无法取得", "vela.reviewShowDetails": "阅读完整变化", "vela.reviewHideDetails": "收起完整变化", "vela.reviewBefore": "修改前（字符串使用引号表示）", "vela.reviewProposed": "拟修改为", "vela.surfaceGrantOpacityConsent": "允许下一次不透明度修改（一次，60 秒）", "vela.surfaceRevokeOpacityConsent": "撤销自动修改不透明度的权限", "vela.surfaceAuthorityStatus.active": "已允许下一次不透明度修改", "vela.surfaceAuthorityStatus.executing": "正在执行已授权的不透明度修改", "vela.surfaceAuthorityStatus.consumed": "本次自动修改权限已使用", "vela.surfaceAuthorityStatus.revoked": "已撤销自动修改不透明度的权限", "vela.surfaceAuthorityStatus.expired": "自动修改权限已过期", "vela.surfaceAuthorityStatus.failed": "已授权修改失败，本次权限已使用", "vela.surfaceApprove": "批准", "vela.surfaceReject": "拒绝", "vela.surfaceStatusProposalReady": "本地操作建议已可查看", "vela.surfaceStatusConfirmation": "请确认本地不透明度更改", "vela.surfaceStatusLayerNameConfirmation": "请确认本地图层重命名", "vela.surfaceStatusExecuting": "正在应用本地不透明度更改", "vela.surfaceStatusExecutionCompleted": "本地不透明度更改已完成", "vela.surfaceStatusRejected": "本地操作建议已拒绝", "vela.surfaceStatusExecutionFailed": "本地不透明度更改失败", "vela.surfaceConfirmationReady": "一个本地不透明度更改已准备待确认。", "vela.surfaceConfirmationLayerNameReady": "一个本地图层重命名已准备待确认。", "vela.surfaceConfirmationRejected": "已拒绝本地操作建议。未发生更改。", "vela.surfaceExecutionCompleted": "本地不透明度更改已完成。", "vela.surfaceConfirmationValue": "不透明度 {before}% → {proposed}%", "vela.surfaceConfirmationLayerName": "图层名称：{before} → {proposed}", "vela.planReviewCapabilitySetLayerName": "重命名图层", "vela.planReviewCapabilitySetOpacity": "图层不透明度", "vela.planReviewParameterLayerName": "图层名称", "settings.sections.vela": "Vela", "settings.vela.title": "Vela 设置", "settings.vela.model": "模型名称", "settings.vela.modelDescription": "请使用与 LM Studio 当前已加载或已暴露的模型标识完全一致的名称。", "settings.vela.fixedEndpoint": "Vela 仅连接本地 LM Studio：http://127.0.0.1:1234/v1/chat/completions。此端点固定，无法在此修改。", "settings.vela.experimentalDescription": "实验性 · 未通过资格认证 · 需手动选择加入。会话启用状态不会保存。", "settings.vela.endpoint": "本地 endpoint", "settings.vela.endpointDescription": "仅允许 loopback LM Studio endpoint（127.0.0.1、localhost 或 ::1）。", "settings.vela.acknowledgement": "我理解此 Provider 为实验性且未通过资格认证", "settings.vela.enableSession": "本会话启用", "settings.vela.disableSession": "禁用", "settings.vela.disabled": "实验 Provider 已禁用", "settings.vela.checking": "正在检查已加载的本地模型…", "settings.vela.ready": "实验 Provider 已在本会话就绪", "settings.vela.unavailable": "配置的本地模型不可用或未加载", "settings.vela.endpointInvalid": "endpoint 必须是 loopback LM Studio base URL", "settings.vela.networkFailed": "无法连接本地 LM Studio 服务器", "settings.vela.httpFailed": "LM Studio readiness 返回了不成功的响应", "settings.vela.responseInvalid": "LM Studio 返回了无效 readiness 响应", "settings.vela.modelNotFound": "未找到配置的模型", "settings.vela.modelNotLoaded": "配置的模型已安装但未加载", "section.geometry": "几何", "section.bounds": "边界", "section.fill": "填充", "section.surface": "表面", "section.stroke": "描边", "section.outline": "轮廓", "section.selection": "选择", "section.layerInfo": "图层信息", "section.contentsAdd": "内容添加", "section.nativeShapeItems": "原生形状元素", "section.defaults": "默认值", "section.strokeFillDefaults": "Stroke / Fill 默认值", "section.trimPaths": "修剪路径", "section.strokeTaper": "描边锥度", "section.motion": "动效", "section.animation": "动画", "section.color": "颜色", "section.theme": "主题", "section.debug": "调试", "section.developerTools": "开发者工具", "settings.sections.proceduralAppearance": "程序化外观参数", "section.procedural": "程序化", "section.backgroundEngine": "背景引擎", "section.shape": "形状", "settings.theme.interfaceAppearance": "界面外观", "settings.theme.coreAppearance": "核心外观", "settings.theme.toolIconAppearance": "工具图标外观", "settings.theme.iconColors": "图标主题端点", "settings.theme.fallbackIconColors": "回退图标颜色", "settings.theme.colorRamp": "暗端到亮端", "settings.theme.darkEndpoint": "暗端", "settings.theme.lightEndpoint": "亮端", "settings.paletteLibrary": "色卡库", "settings.paletteSummary.builtIn": "个内置", "settings.paletteSummary.custom": "个自定义", "settings.paletteSummary.overrides": "个工具覆盖", "settings.palette.manage": "管理色卡", "settings.palette.manageSource": "管理源色卡", "paletteLibrary.title": "色卡库", "paletteLibrary.description": "编辑程序化精选色卡、自定义色卡和 Home 工具配色分配。", "paletteLibrary.builtIn": "内置", "paletteLibrary.custom": "自定义", "paletteLibrary.modified": "已修改", "paletteLibrary.displayName": "显示名称", "paletteLibrary.shadow": "阴影", "paletteLibrary.base": "主色", "paletteLibrary.secondary": "辅色", "paletteLibrary.highlight": "高光", "paletteLibrary.stop1": "色标 1", "paletteLibrary.stop2": "色标 2", "paletteLibrary.stop3": "色标 3", "paletteLibrary.stop4": "色标 4", "paletteLibrary.weight.shadow": "阴影权重", "paletteLibrary.weight.base": "主色权重", "paletteLibrary.weight.secondary": "辅色权重", "paletteLibrary.weight.highlight": "高光权重", "paletteLibrary.new": "新建色卡", "paletteLibrary.duplicate": "复制", "paletteLibrary.duplicatePalette": "复制色卡", "paletteLibrary.legacyReadOnly": "此色卡使用高级色槽关系，当前编辑器仅支持只读查看。", "paletteLibrary.delete": "删除", "paletteLibrary.hide": "隐藏", "paletteLibrary.show": "显示", "paletteLibrary.restoreDefaults": "恢复默认", "paletteLibrary.import": "导入", "paletteLibrary.export": "导出", "paletteLibrary.replace": "替换", "paletteLibrary.merge": "合并", "paletteLibrary.invalidPalette": "无效色卡", "paletteLibrary.paletteInUse": "色卡正在使用", "paletteLibrary.unsavedChanges": "未保存更改", "paletteLibrary.saved": "已保存", "paletteLibrary.save": "保存", "paletteLibrary.cancel": "取消", "paletteLibrary.saveAndContinue": "保存并继续", "paletteLibrary.discardChanges": "放弃更改", "paletteLibrary.open": "打开色卡库", "paletteLibrary.backToSettings": "返回设置", "paletteLibrary.resizePaletteList": "调整色卡列表宽度", "paletteLibrary.deletePalette": "删除色卡", "paletteLibrary.deleteConfirmation": "删除 {name}？当前有 {count} 个工具使用此色卡。", "paletteLibrary.paletteDeleted": "色卡已删除", "paletteLibrary.exportConfiguration": "导出色卡配置", "paletteLibrary.exportDescription": "导出自定义色卡、内置色卡修改和 Home 工具映射，用于备份或迁移。", "paletteLibrary.exportResult": "导出结果", "paletteLibrary.generateJson": "生成 JSON", "paletteLibrary.copyJson": "复制导出 JSON", "paletteLibrary.exportCopied": "导出内容已复制", "paletteLibrary.importConfiguration": "导入色卡配置", "paletteLibrary.importDescription": "粘贴之前导出的 JSON，然后选择合并或替换当前用户配置。", "paletteLibrary.importInput": "粘贴导入 JSON", "paletteLibrary.pasteJsonPlaceholder": "在此粘贴已导出的色卡 JSON", "paletteLibrary.validate": "验证", "paletteLibrary.jsonValid": "JSON 验证通过", "paletteLibrary.mergeImport": "合并导入", "paletteLibrary.replaceImport": "替换导入", "paletteLibrary.replaceConfirmation": "替换所有自定义色卡、内置色卡修改和 Home 映射？内置原始色卡仍会保留。", "paletteLibrary.clear": "清空", "paletteLibrary.invalidJson": "无效 JSON", "paletteLibrary.importSuccessful": "导入成功", "paletteLibrary.toolMapping": "Home 工具色卡映射", "paletteLibrary.importExport": "导入 / 导出 JSON", "paletteLibrary.tool.shapeAdd": "Shape Add", "paletteLibrary.tool.textBackgroundBox": "Text Background Box", "paletteLibrary.tool.selectionInfo": "Selection Info", "paletteLibrary.tool.ecommerceLayout": "Ad Component Kit", "paletteLibrary.tool.proceduralAppearanceLab": "程序化外观实验室", "paletteLibrary.tool.registryControlLab": "注册器控制实验室", "tools.registryControlLab.fields.shadowField": "阴影", "tools.registryControlLab.fields.colorAlphaField": "颜色 + 透明度", "tools.registryControlLab.sections.coreUiDirect": "CoreUI 直接路径", "paletteLibrary.tool.settingsRendererLab": "Settings Renderer Lab", "paletteLibrary.dynamicSlots": "动态色槽", "paletteLibrary.proceduralProfile": "程序化外观 Profile", "paletteLibrary.slotLabel": "色槽名称", "paletteLibrary.slotKind": "色槽类型", "paletteLibrary.slotColor": "颜色", "paletteLibrary.sourceSlot": "源色槽", "paletteLibrary.sourceSlot1": "源 A", "paletteLibrary.sourceSlot2": "源 B", "paletteLibrary.derivation": "派生方式", "paletteLibrary.parameter.amount": "混合量", "paletteLibrary.parameter.hueDelta": "色相偏移", "paletteLibrary.parameter.lightnessDelta": "明度偏移", "paletteLibrary.parameter.chromaScale": "彩度缩放", "paletteLibrary.parameter.saturationBias": "饱和度偏置", "paletteLibrary.parameter.luminanceBias": "亮度偏置", "paletteLibrary.parameter.contrastBias": "对比度偏置", "paletteLibrary.addDIRECT": "添加直接色槽", "paletteLibrary.addREFERENCE": "添加引用色槽", "paletteLibrary.addDERIVED": "添加派生色槽", "paletteLibrary.moveUp": "上移", "paletteLibrary.moveDown": "下移", "paletteLibrary.slotDeleteBlocked": "仍被以下项依赖，无法删除：", "label.paddingX": "Padding X", "label.paddingY": "Padding Y", "label.roundness": "圆角", "label.fillColor": "填充颜色", "label.fillOpacity": "填充不透明度", "label.strokeColor": "描边颜色", "label.strokeWidth": "描边宽度", "label.miterLimit": "尖角限制", "label.strokeOpacity": "描边不透明度", "label.autoSelectionStatus": "自动选择状态", "label.registryDebugTools": "开发者模式", "label.homeIconRadius": "主页图标圆角", "label.homeDragShadowIntensity": "主页拖动投影", "label.strokeFillLayer": "新建 Stroke / Fill 形状图层", "label.trimStart": "修剪开始", "label.trimEnd": "修剪结束", "label.trimOffset": "修剪偏移", "label.startLength": "起始长度", "label.endLength": "结束长度", "label.startWidth": "起始宽度", "label.endWidth": "结束宽度", "label.startEase": "起始缓动", "label.endEase": "结束缓动", "label.motionSpeed": "动画速度", "label.uiScale": "UI 缩放", "label.accentColor": "界面强调色", "label.homeBaseColor": "主页基底色", "label.proceduralIconMode": "图标配色模式", "label.proceduralParam.warp": "扭曲", "label.proceduralParam.warpIrregularity": "扭曲不规则度", "label.proceduralParam.flowComplexity": "流场复杂度", "label.proceduralParam.flowContinuity": "流动连续性", "label.proceduralParam.ribbonWidth": "流动色带宽度", "label.proceduralParam.gradientBias": "渐变偏置", "label.proceduralParam.highlightConcentration": "高光聚集", "label.proceduralParam.highlightArea": "高光面积", "label.proceduralParam.secondaryHueInfluence": "辅色相影响", "label.proceduralParam.accentPresence": "强调色存在度", "label.proceduralParam.highlightTintShift": "高光色相偏移", "label.proceduralParam.contrast": "对比度", "label.proceduralParam.depth": "深度", "label.proceduralParam.saturation": "饱和度", "label.proceduralParam.brightness": "亮度", "label.proceduralParam.grain": "颗粒质感", "label.proceduralParam.paletteDarkness": "色卡阴影压暗", "label.proceduralParam.paletteMidLift": "色卡主色亮度提升", "label.proceduralParam.paletteLightLift": "色卡高光亮度提升", "label.proceduralParam.paletteDarkChroma": "色卡阴影彩度", "label.proceduralParam.paletteLightChroma": "色卡高光彩度", "label.proceduralParam.paletteMapMidpoint": "色卡映射中点", "label.proceduralParam.paletteMapContrast": "色卡映射对比度", "label.toolIconColor": "图标暗端色", "label.toolIconLine": "图标亮端色", "label.iconDarkSource": "图标暗端来源", "label.sourcePalette": "源色卡", "label.backgroundSource": "背景来源", "label.proceduralBackgroundSeed": "程序化种子", "label.proceduralBackgroundPalette": "源色卡", "label.proceduralBackgroundIntensity": "背景强度", "label.preset": "预设", "label.background": "背景", "label.secondary": "次级", "label.accent": "强调", "label.accent2": "强调 2", "label.line": "线条", "label.glow": "光晕", "label.glowIntensity": "光晕强度", "label.glowSize": "光晕尺寸", "label.glowX": "光晕 X", "label.glowY": "光晕 Y", "label.gridOpacity": "网格不透明度", "label.gridSize": "网格尺寸", "label.lineOpacity": "线条不透明度", "label.ringOpacity": "圆环不透明度", "label.ringScale": "圆环缩放", "label.accentAngle": "强调角度", "label.patternDensity": "图案密度", "label.contrast": "对比度", "label.enableMotion": "启用动态", "label.motionAmount": "动态幅度", "label.gap": "间距", "label.cornerRadius": "边角半径", "label.pillWidthMode": "胶囊宽度模式", "label.fixedWidth": "固定宽度", "label.gradientEnable": "启用渐变", "label.textAlign": "文本对齐", "label.sort": "排序", "label.columns": "列数", "label.normalizeMode": "统一尺寸模式", "label.targetWidth": "目标宽度", "label.targetHeight": "目标高度", "label.cellWidth": "单元格宽度", "label.cellHeight": "单元格高度", "label.gapX": "X 间距", "label.gapY": "Y 间距", "label.lastRowAlign": "最后一行对齐", "helper.autoSelectionStatus": "面板打开时刷新选中文本层数量。", "helper.motionSpeed": "调整面板过渡动画。1.00 为平衡值。", "helper.uiScale": "为狭窄面板调整文字和控件密度。", "helper.accentColor": "用于主要操作、焦点状态和界面重点元素。", "helper.homeBaseColor": "设置主页表面的底层基底色，不代表完整背景处理。", "helper.toolIconColor": "主题映射暗端和回退图标底色。", "helper.toolIconLine": "调整主题映射亮端和回退图标重点色。", "helper.iconDarkSource": "选择手动暗端色，或使用可见源色卡的主体色。", "helper.sourcePalette": "选中色卡的主体色将成为主题映射暗端。", "helper.proceduralIconMode": "彩色模式使用每个工具的分配色卡。主题映射模式按生成图像明度在底色和重点色之间映射。", "helper.proceduralIconModeColorful": "使用每个工具分配的色卡作为最终颜色外观。", "helper.proceduralIconModeThemeMapped": "保留生成纹理，并将其明度映射到两种主题颜色之间。", "helper.proceduralIconSource": "源色卡仍决定各工具的生成纹理和明度结构。主题映射只替换最终色相，不改变程序化身份。", "helper.fallbackIconColors": "仅在程序化图标无法渲染并显示回退图标时使用。", "settings.proceduralIconMode.colorful": "彩色", "settings.proceduralIconMode.themeMapped": "主题映射", "settings.iconDarkSource.manualEndpoints": "手动端点", "settings.iconDarkSource.paletteScale": "色卡明度缩放", "settings.palette.none": "没有可用源色卡", "settings.backgroundSource.classic": "经典", "settings.backgroundSource.followIconTheme": "跟随图标主题", "settings.backgroundSource.procedural": "手动程序化", "settings.backgroundPalette.algorithmDefault": "当前算法配色", "settings.theme.midEndpoint": "中间调", "status.paletteAccentSuggested": "已将色卡辅色设为界面强调色，之后可独立调整。", "helper.registryDebugTools": "显示仅用于开发测试的 debug、probe 和 lab registry 工具。", "helper.proceduralAppearanceParams": "仅开发者模式可见，调整图标和背景共用的程序化渲染参数，并实时更新两者。", "helper.proceduralParam.warp": "控制坐标扭曲强度。", "helper.proceduralParam.warpIrregularity": "增加不均匀的局部流动。", "helper.proceduralParam.flowComplexity": "控制多层流场影响的数量。", "helper.proceduralParam.flowContinuity": "控制流动结构的平滑融合。", "helper.proceduralParam.ribbonWidth": "控制连续流动色带的宽度。", "helper.proceduralParam.gradientBias": "将渐变重映射到更亮或更暗的范围。", "helper.proceduralParam.highlightConcentration": "控制高光的聚集程度。", "helper.proceduralParam.highlightArea": "限制高光占据的面积。", "helper.proceduralParam.secondaryHueInfluence": "控制辅色相的可见贡献。", "helper.proceduralParam.accentPresence": "控制局部强调色的数量。", "helper.proceduralParam.highlightTintShift": "控制高光的色相偏移。", "helper.proceduralParam.contrast": "控制亮暗结构的分离度。", "helper.proceduralParam.depth": "控制分层深度和折叠阴影。", "helper.proceduralParam.saturation": "控制整体色彩强度。", "helper.proceduralParam.brightness": "控制整体光亮水平。", "helper.proceduralParam.grain": "增加克制的确定性表面质感。", "helper.proceduralParam.paletteDarkness": "在 OKLab 中压暗色卡阴影端点。", "helper.proceduralParam.paletteMidLift": "提升色卡主色并用于中间映射节点。", "helper.proceduralParam.paletteLightLift": "在 OKLab 中提升色卡高光端点。", "helper.proceduralParam.paletteDarkChroma": "控制色卡映射时阴影的彩度压缩。", "helper.proceduralParam.paletteLightChroma": "控制色卡映射时高光的彩度压缩。", "helper.proceduralParam.paletteMapMidpoint": "设置映射到色卡中间节点的源图像明度。", "helper.proceduralParam.paletteMapContrast": "调整暗到中和中到亮的明度响应。", "helper.homeIconRadius": "仅开发者模式可见，控制主页工具图标和同类正方形预览的比例圆角。", "helper.homeDragShadowIntensity": "仅开发者模式可见，控制主页编辑时当前拖动图标下方的柔化投影强度。", "helper.preset": "从设计好的程序化外观开始。", "helper.enableMotion": "仅使用缓慢的透明度和位移动画。", "helper.backgroundSource": "经典模式保留现有 Background Engine。跟随图标主题会复用图标的主题关系。手动程序化使用下方的背景种子和色卡。", "helper.proceduralBackgroundSeed": "固定种子控制程序化背景构图，且与工具图标 id 独立。", "helper.proceduralBackgroundPalette": "使用解析后的色卡作为程序化背景的色彩来源。", "helper.proceduralBackgroundIntensity": "控制程序化背景的可见度，不改变源图像身份。", "settings.backgroundPreset.custom": "自定义", "settings.backgroundPreset.blackGold": "黑金默认", "settings.backgroundPreset.solarGrid": "太阳网格", "settings.backgroundPreset.obsidianRings": "黑曜圆环", "settings.backgroundPreset.midnightBlueprint": "午夜蓝图", "settings.backgroundPreset.minimalDark": "极简深色", "helper.refreshSelectionPrompt": "点击“刷新选择”以检查当前合成选区。", "button.createBackgroundBox": "创建圆角矩形", "button.refreshSelection": "刷新选择", "button.randomize": "随机", "button.resetDefaults": "恢复默认", "button.resetProceduralAppearanceParams": "恢复程序化默认参数", "button.regenerateBackgroundSeed": "重新生成种子", "status.ready": "就绪", "status.readyPeriod": "就绪。", "status.loadingHost": "正在加载 host JSX...", "status.hostLoading": "host JSX 仍在加载...", "status.hostLoadError": "错误：host JSX 未加载。请检查 host/index.jsx include。", "bootstrap.loadingTools": "正在加载工具...", "bootstrap.partialFailure": "部分工具加载失败。", "bootstrap.loadFailed": "工具加载失败。", "bootstrap.retry": "重试", "status.noActiveComp": "没有激活的合成", "status.openComp": "请打开合成", "status.noLayer": "请至少选择一个图层", "status.noTextLayer": "请至少选择一个文本层", "status.selectShapeLayer": "请选择形状图层", "status.createdItems": "已创建 {count} 个项目", "status.createdBackgroundBoxes": "已创建 {count} 个背景圆角矩形", "status.createdStrokeFillLayer": "已创建 Stroke / Fill 形状图层", "status.creatingBackgroundBox": "正在创建圆角矩形...", "status.creatingStrokeFillLayer": "正在创建 Stroke / Fill 形状图层...", "status.selectionUpdated": "选择信息已更新。", "status.readingSelection": "正在读取选择...", "status.noResponse": "After Effects 没有响应。", "status.colorPickerOpening": "正在打开 AE 取色器...", "status.colorUpdated": "颜色已更新。", "status.colorUnchanged": "颜色未改变。", "status.defaultsRestored": "已恢复默认值。", "status.motionSpeedUpdated": "动画速度已更新。", "status.backgroundRandomized": "背景已随机。", "status.backgroundDefaultsRestored": "背景已恢复默认。", "status.proceduralBackgroundSeedRegenerated": "程序化背景种子已重新生成。", "status.proceduralAppearanceDefaultsRestored": "程序化外观默认参数已恢复。", "status.homeEditing": "主页编辑中。拖动工具可重排。", "status.homeLayoutSaved": "主页布局已保存。", "status.addingShape": "正在添加 {label}...", "status.addedShape": "已添加：{label}", "status.noSelectedLayers": "没有选中图层。", "status.oneLayerSelected": "已选择 1 个图层", "status.multipleLayersSelected": "已选择 {count} 个图层", "status.unableReadSelection": "无法读取选择。", "selection.noShapeTarget": "无形状目标", "selection.shapeTarget": "形状目标", "selection.layerCount": "{count} 个图层" } }, "defaults": { "base.accent": "#d6b25e", "base.canvas": "#050403", "layout.scale": 0.92, "motion.speed": 1, "surface.panel": "#0b0a08", "text.primary": "#f6f0df", "text.secondary": { "color": "#f6f0df", "alpha": 0.66 }, "text.tertiary": { "color": "#f6f0df", "alpha": 0.42 }, "select.trigger.surface": "#0b0a08", "select.menu.surface": "#0b0a08", "typography.title.size": 1, "typography.sectionTitle.size": 1, "typography.fieldLabel.size": 1, "typography.body.size": 1, "typography.supporting.size": 1, "typography.code.size": 1, "action.primary.foreground": "#130f08", "interaction.focus.ring": "rgba(224, 196, 133, 0.62)", "interaction.focus.border": "rgba(224, 196, 133, 0.62)", "interaction.hover.border": "rgba(224, 196, 133, 0.62)", "interaction.hover.surface": "rgba(214, 178, 94, 0.24)", "interaction.selected.surface": "rgba(214, 178, 94, 0.24)", "interaction.selected.foreground": "#e0c485", "interaction.checked.surface": "rgba(214, 178, 94, 0.24)", "action.primary.surface": "rgba(214, 178, 94, 0.86)", "action.primary.hoverSurface": "#e0c485", "selection.indicator.surface": "#5a4b27" }, "variables": { "--select-menu-available-height": "calc(220px * var(--ui-scale))", "--select-menu-viewport-inset": "calc(4px * var(--ui-scale))", "--ui-field-row-control-gap": "var(--space-palette-field-control)", "--palette-splitter-width": "calc(10px * var(--ui-scale))", "--palette-library-width": "210px", "--settings-divider-soft": "rgba(214, 178, 94, 0.085)", "--button-pad-x": "calc(14px * var(--ui-scale))", "--button-height": "calc(40px * var(--ui-scale))", "--radius-sm": "calc(10px * var(--ui-scale))", "--radius-lg": "calc(22px * var(--ui-scale))", "--radius-xl": "calc(30px * var(--ui-scale))", "--view-inset": "calc(16px * var(--ui-scale))", "--view-pad": "var(--space-surface-edge)", "--card-pad": "var(--space-card-inset)", "--space-inline-control": "calc(10px * var(--ui-scale))", "--space-field-block": "calc(14px * var(--ui-scale))", "--space-field-copy": "calc(10px * var(--ui-scale))", "--space-section-header-content": "calc(24px * var(--ui-scale))", "--space-section-stack": "calc(28px * var(--ui-scale))", "--space-content-block-inset": "calc(8px * var(--ui-scale))", "--space-content-inline-inset": "calc(12px * var(--ui-scale))", "--space-card-inset": "calc(12px * var(--ui-scale))", "--space-surface-edge": "calc(22px * var(--ui-scale))", "--control-height": "calc(22px * var(--ui-scale))", "--font-small": "var(--type-supporting-size)", "--font-h3": "var(--type-section-title-size)", "--font-h2": "var(--type-surface-title-size)", "--font-h1": "var(--type-page-title-size)", "--font-body": "var(--type-body-size)", "--tool-icon-small-size": "calc(50px * var(--ui-scale))", "--elevation-registry-preview-prominence": "0 calc(12px * var(--ui-scale)) calc(24px * var(--ui-scale)) rgba(0, 0, 0, 0.24)", "--elevation-action-container": "0 8px 30px rgba(113, 224, 255, 0.32)", "--elevation-floating-picker": "0 10px 48px rgba(72, 146, 214, 0.51)", "--elevation-floating-surface": "0 10px 48px rgba(72, 146, 214, 0.51)", "--elevation-utility-action": "0 8px 28px rgba(48, 196, 255, 0.46)", "--elevation-primary-action": "0 4px 10px rgba(0, 0, 0, 0.18)", "--elevation-information-surface": "0 12px 30px rgba(0, 0, 0, 0.28)", "--elevation-surface-shell": "0 18px 48px rgba(0, 0, 0, 0.38)", "--home-drag-shadow-secondary": "rgba(0, 0, 0, 0.32)", "--home-drag-shadow-primary": "rgba(0, 0, 0, 0.48)", "--tool-icon-radius": "var(--home-tool-icon-radius)", "--home-tool-icon-radius": "var(--radius-home-icon)", "--radius-home-icon": "25.5%", "--tool-icon-size": "calc(76px * var(--ui-scale))", "--tool-card-min-h": "calc(124px * var(--ui-scale))", "--tool-card-w": "calc(92px * var(--ui-scale))", "--tool-gap": "var(--space-home-tool-grid)", "--space-home-card-title": "calc(14px * var(--ui-scale))", "--space-home-major-stack": "calc(30px * var(--ui-scale))", "--space-home-tool-grid": "calc(16px * var(--ui-scale))", "--space-palette-field-control": "calc(10px * var(--ui-scale))", "--space-registry-action-stack": "var(--space-registry-field-control)", "--space-registry-field-control": "calc(14px * var(--ui-scale))", "--space-registry-field-block": "var(--space-field-block)", "--space-registry-field-copy": "calc(4px * var(--ui-scale))", "--space-registry-section-copy": "calc(4px * var(--ui-scale))", "--space-registry-section-header-content": "calc(12px * var(--ui-scale))", "--space-registry-card-inset": "calc(30px * var(--ui-scale))", "--space-registry-intro-content": "calc(22px * var(--ui-scale))", "--space-registry-panel-stack": "var(--space-section-stack)", "--space-settings-field-control": "calc(12px * var(--ui-scale))", "--space-settings-field-block": "var(--space-field-block)", "--space-settings-field-copy": "var(--space-field-copy)", "--space-settings-section-copy": "var(--space-field-copy)", "--space-settings-section-header-content": "var(--space-section-header-content)", "--space-settings-section-stack": "var(--space-section-stack)", "--type-registry-supporting-line-height": "1.35", "--type-registry-supporting-weight": "400", "--type-registry-supporting-size": "var(--type-supporting-size)", "--type-registry-field-line-height": "1.35", "--type-registry-field-weight": "600", "--type-home-card-title-line-height": "1.18", "--type-home-card-title-weight": "800", "--type-home-card-title-size": "calc(13px * var(--ui-scale))", "--type-settings-field-label-weight": "800", "--type-field-label-line-height": "1.35", "--type-field-label-weight": "650", "--type-field-label-size": "calc(12px * var(--appearance-type-field-label-scale) * var(--ui-scale))", "--type-code-line-height": "1.45", "--type-code-weight": "normal", "--type-code-size": "calc(10.5px * var(--appearance-type-code-scale) * var(--ui-scale))", "--type-eyebrow-line-height": "1", "--type-eyebrow-weight": "800", "--type-eyebrow-size": "var(--type-supporting-size)", "--type-supporting-line-height": "1.35", "--type-supporting-weight": "normal", "--type-supporting-size": "calc(10.5px * var(--appearance-type-supporting-scale) * var(--ui-scale))", "--type-control-line-height": "normal", "--type-control-weight": "normal", "--type-control-size": "var(--type-body-size)", "--type-body-line-height": "1.42", "--type-body-weight": "normal", "--type-body-size": "calc(12px * var(--appearance-type-body-scale) * var(--ui-scale))", "--type-section-title-line-height": "1.18", "--type-section-title-weight": "700", "--type-section-title-size": "calc(14px * var(--appearance-type-section-title-scale) * var(--ui-scale))", "--type-surface-title-line-height": "1.1", "--type-surface-title-weight": "780", "--type-surface-title-size": "calc(21px * var(--appearance-type-title-scale) * var(--ui-scale))", "--type-page-title-line-height": "1.04", "--type-page-title-weight": "800", "--type-page-title-size": "calc(24px * var(--appearance-type-title-scale) * var(--ui-scale))", "--appearance-type-code-scale": "1", "--appearance-type-supporting-scale": "1", "--appearance-type-body-scale": "1", "--appearance-type-field-label-scale": "1", "--appearance-type-section-title-scale": "1", "--appearance-type-title-scale": "1", "--font-mono": '"Consolas", "Courier New", monospace', "--font-ui": '"Segoe UI", Arial, sans-serif', "--ui-scale": "0.92", "--motion-drag-settle-duration": "var(--dur-normal)", "--motion-palette-exit-duration": "var(--dur-fast)", "--motion-palette-enter-duration": "var(--dur-normal)", "--motion-home-restore-duration": "var(--dur-normal)", "--motion-home-recede-duration": "var(--dur-normal)", "--motion-view-content-exit-duration": "120ms", "--motion-view-content-enter-duration": "180ms", "--motion-collapse-duration": "var(--dur-normal)", "--motion-surface-state-duration": "var(--dur-fast)", "--motion-action-press-duration": "var(--dur-instant)", "--motion-action-feedback-duration": "var(--dur-fast)", "--dur-close": "360ms", "--dur-normal": "260ms", "--dur-fast": "160ms", "--dur-instant": "120ms", "--procedural-background-drift-curve": "cubic-bezier(0.22, 1, 0.36, 1)", "--ease-press": "var(--motion-curve-press)", "--ease-apple-in": "var(--motion-curve-exit)", "--ease-apple-standard": "var(--motion-curve-standard)", "--ease-apple-out": "var(--motion-curve-enter)", "--motion-curve-press": "cubic-bezier(0.2486, -0.6113, 0.3389, 1.325)", "--motion-curve-standard": "cubic-bezier(0.0273, 1.0024, 0.36, 1)", "--motion-curve-exit": "cubic-bezier(0.0421, 0.5278, 0.1749, 0.999)", "--motion-curve-enter": "cubic-bezier(0.16, 1, 0.3, 1)", "--radius-pill": "999px", "--radius-palette-json-section": "var(--radius-nested-surface)", "--radius-palette-library-item": "var(--radius-nested-surface)", "--radius-registry-option": "var(--radius-nested-surface)", "--radius-home-tile": "var(--radius-lg)", "--radius-editable-control": "calc(20px * var(--ui-scale))", "--radius-nested-surface": "calc(28px * var(--ui-scale))", "--radius-section-card": "var(--radius-lg)", "--radius-md": "calc(16px * var(--ui-scale))", "--radius-palette-preview": "var(--radius-lg)", "--radius-primary-work-surface": "calc(35px * var(--ui-scale))", "--status-dot-size": "calc(7px * var(--ui-scale))", "--status-tone-disabled": "var(--text-tertiary)", "--status-tone-error": "var(--danger)", "--status-tone-warning": "var(--gold-hot)", "--status-tone-success": "var(--success)", "--status-tone-processing": "var(--gold-hot)", "--status-tone-idle": "var(--text-secondary)", "--action-danger-hover-surface": "rgba(255, 107, 95, 0.30)", "--danger-surface": "rgba(255, 107, 95, 0.22)", "--danger-border": "rgba(255, 107, 95, 0.34)", "--danger": "#ff6b5f", "--success": "#c8e08a", "--bg-motion-amount": "1", "--bg-motion-speed": "18s", "--bg-contrast": "0.45", "--bg-pattern-density": "1", "--bg-accent-angle": "135deg", "--bg-ring-scale": "1", "--bg-ring-opacity": "0.1", "--bg-line-opacity": "0.18", "--bg-grid-size": "36px", "--bg-grid-opacity": "0.12", "--bg-glow-y": "18%", "--bg-glow-x": "74%", "--bg-glow-size": "80%", "--bg-glow-opacity": "0.22", "--bg-proc-glow": "rgba(214, 178, 94, 0.5)", "--bg-proc-line": "rgba(214, 178, 94, 0.5)", "--bg-proc-accent-2": "#755f2a", "--bg-proc-accent": "#d6b25e", "--bg-proc-secondary": "#11100c", "--bg-proc-base": "#050403", "--border-subtle": "var(--separator)", "--border-default": "var(--panel-border)", "--select-menu-surface": "#0b0a08", "--select-trigger-surface": "#0b0a08", "--registry-option-surface": "rgba(8, 7, 6, 0.68)", "--field-border": "var(--input-border)", "--field-surface": "rgba(5, 4, 3, 0.5)", "--input-border": "rgba(214, 178, 94, 0.16)", "--panel-border": "rgba(214, 178, 94, 0.22)", "--separator": "rgba(214, 178, 94, 0.16)", "--text-on-accent": "#130f08", "--surface-utility-action": "rgba(16, 63, 103, 1)", "--surface-utility-chrome": "rgba(18, 17, 14, 1)", "--surface-conversation": "rgba(17, 16, 12, 1)", "--surface-panel": "#0b0a08", "--text-muted": "var(--text-tertiary)", "--text-tertiary": "rgba(246, 240, 223, 0.42)", "--text-secondary": "rgba(246, 240, 223, 0.66)", "--text-primary": "#f6f0df", "--surface-canvas": "var(--bg-main)", "--selection-indicator-surface": "var(--selection-bg)", "--action-neutral-surface": "rgba(60, 82, 105, 1)", "--action-primary-foreground": "var(--text-on-accent)", "--action-primary-hover-surface": "var(--gold-hot)", "--action-primary-surface": "var(--gold-button)", "--switch-thumb-optical-shadow": "0 4px 16px rgba(92, 191, 255, 0.79)", "--slider-thumb-optical-shadow": "0 4px 16px rgba(92, 191, 255, 0.79)", "--interaction-checked-surface": "var(--gold-track)", "--interaction-selected-foreground": "var(--gold-hot)", "--interaction-selected-surface": "var(--gold-track)", "--interaction-hover-surface": "var(--gold-track)", "--interaction-hover-border": "var(--gold-focus)", "--interaction-focus-border": "var(--gold-focus)", "--interaction-focus-ring": "var(--gold-focus)", "--selection-bg": "#3b2d12", "--gold-button": "rgba(214, 178, 94, 0.86)", "--gold-focus": "rgba(241, 210, 122, 0.62)", "--gold-track": "rgba(214, 178, 94, 0.24)", "--gold-hot": "#f1d27a", "--gold-soft": "rgba(214, 178, 94, 0.72)", "--gold": "#d6b25e", "--tool-icon-fill": "rgba(255, 240, 190, 0.13)", "--tool-icon-line-soft": "rgba(255, 240, 190, 0.64)", "--tool-icon-line": "rgba(255, 240, 190, 0.9)", "--tool-icon-hover-bg": "rgba(34, 28, 18, 0.94)", "--tool-icon-bg": "#15120c", "--bg-main": "#050403" }, "durations": { "actionFeedback": 160, "actionPress": 120, "surfaceState": 160, "structuralCollapse": 260, "viewContentEnter": 400, "viewContentExit": 340, "homeHandoffRecede": 220, "homeHandoffRestore": 300, "spatialMorphExpand": 460, "spatialMorphContract": 400, "spatialMorphIdentity": 330, "toolIdentityOpen": 450, "paletteEnter": 260, "paletteExit": 160, "dragSettle": 260 } };

  // client/reference/src/copy.js
  var locale = { value: "en" };
  var keys = new Map(Object.entries(DATA.dictionaries.en).filter(([key]) => key.startsWith(["reference", "ui", ""].join("."))).map(([key, value2]) => [value2, key]));
  function copy(source, values = {}) {
    const key = keys.get(source), text2 = key ? DATA.dictionaries[locale.value]?.[key] || source : source;
    return text2.replace(/\{(\w+)\}/g, (_, name2) => values[name2] ?? "{" + name2 + "}");
  }

  // client/reference/src/shared.js
  var esc = (value2) => String(value2 ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  function t(key, values = {}) {
    let text2 = DATA.dictionaries[locale.value]?.[key] ?? DATA.dictionaries.en[key] ?? key;
    return text2.replace(/\{(\w+)\}/g, (_, k) => values[k] ?? "{" + k + "}");
  }
  var bilingual = (en, zh) => copy(en);
  var OverlayOwner = class {
    constructor(root2) {
      this.root = root2;
      this.current = null;
    }
    ask(message, choices) {
      if (this.current) return Promise.resolve("stay");
      const focus = document.activeElement, layer = document.createElement("div");
      layer.className = "ref-modal";
      layer.innerHTML = `<section role="dialog" aria-modal="true" aria-labelledby="leave-title"><h2 id="leave-title">${esc(t("reference.confirm"))}</h2><p>${esc(message)}</p><div>${choices.map(([id, label2]) => `<button data-answer="${id}">${esc(label2)}</button>`).join("")}</div></section>`;
      this.root.append(layer);
      const abort2 = new AbortController();
      return new Promise((resolve) => {
        const done = (id) => {
          abort2.abort();
          layer.remove();
          this.current = null;
          if (focus?.isConnected) focus.focus({ preventScroll: true });
          resolve(id);
        };
        this.current = { done, layer };
        layer.addEventListener("click", (e) => {
          const answer = e.target.closest("[data-answer]");
          if (answer) done(answer.dataset.answer);
        }, { signal: abort2.signal });
        document.addEventListener("keydown", (e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            e.stopImmediatePropagation();
            done("stay");
          }
          if (e.key === "Tab") {
            const items = [...layer.querySelectorAll("button")], index = items.indexOf(document.activeElement);
            e.preventDefault();
            items[(index + (e.shiftKey ? -1 : 1) + items.length) % items.length].focus();
          }
        }, { signal: abort2.signal, capture: true });
        layer.querySelector("button").focus();
      });
    }
    dispose() {
      this.current?.done("stay");
    }
  };
  function preserveReading(root2, change) {
    const pinned = root2.scrollHeight - root2.scrollTop - root2.clientHeight < 12;
    const anchor = [...root2.children].find((el) => viewportRect(el).bottom > viewportRect(root2).top);
    const top = anchor ? viewportRect(anchor).top : null;
    change();
    if (pinned) root2.scrollTop = root2.scrollHeight;
    else if (anchor?.isConnected) root2.scrollTop += (viewportRect(anchor).top - top) / viewportScale(root2);
  }

  // client/reference/src/size-probe.js
  var SizeProbe = class {
    constructor(root2) {
      this.root = root2;
      this.frame = null;
      this.epoch = 0;
    }
    start() {
      if (this.frame !== null) return;
      this.result = null;
      const rows = [], start = performance.now(), epoch = ++this.epoch;
      const box = (el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect(), v = viewportRect(el), s = getComputedStyle(el), b = [s.borderLeftWidth, s.borderRightWidth, s.borderTopWidth, s.borderBottomWidth].map((x) => parseFloat(x) || 0);
        const gutter = [el.offsetWidth - el.clientWidth - b[0] - b[1], el.offsetHeight - el.clientHeight - b[2] - b[3]], scale2 = [v.width / (el.offsetWidth || 1), v.height / (el.offsetHeight || 1)];
        return { tag: el.tagName, id: el.id, class: el.className?.baseVal ?? el.className, client: [el.clientWidth, el.clientHeight], offset: [el.offsetWidth, el.offsetHeight], scroll: [el.scrollWidth, el.scrollHeight], scrollPosition: [el.scrollLeft, el.scrollTop], border: b, rect: [r.x, r.y, r.width, r.height], viewportRect: v, scrollbarLayout: gutter, scrollbarViewport: gutter.map((n, i) => n * scale2[i]), width: s.width, zoom: s.zoom, transform: s.transform, overflow: [s.overflowX, s.overflowY], opacity: s.opacity, backdropFilter: s.backdropFilter || s.webkitBackdropFilter, mask: s.maskImage || s.webkitMaskImage, viewBox: el.getAttribute("viewBox"), writes: el.dataset.sizeWrites || null, canvas: el.tagName === "CANVAS" ? [el.width, el.height] : null };
      };
      const details = this.root.querySelector("[data-size-evidence]");
      if (details) details.hidden = true;
      this.root.querySelector("[data-size-probe]").disabled = true;
      const sample = (now) => {
        if (epoch !== this.epoch) return;
        const panel = this.root.querySelector(".color-picker-panel");
        rows.push({ ms: Math.round(now - start), viewport: [innerWidth, innerHeight], documentClient: [document.documentElement.clientWidth, document.documentElement.clientHeight], calibration: innerWidth / this.root.getBoundingClientRect().width, instances: document.querySelectorAll(".color-picker-layer").length, document: box(document.documentElement), body: box(document.body), root: box(this.root), header: box(this.root.querySelector(".ref-header")), page: box(this.root.querySelector(".ref-page")), scrollOwners: [...this.root.querySelectorAll(".pal-detail,.pal-catalog,.reg-body,.reg-form,.cv-detail,.cp-body")].map(box), graph: box(this.root.querySelector(".reg-curve-graph")), viewportBox: box(this.root.querySelector(".reg-graph-viewport")), layer: box(this.root.querySelector(".color-picker-layer")), panel: box(panel), pickerBody: box(this.root.querySelector(".cp-body")), plane: box(this.root.querySelector(".cp-plane")), canvas: box(this.root.querySelector(".cp-plane canvas")), halo: [...this.root.querySelectorAll(".cp-halo,.cp-halo>span")].map(box), ancestors: [...(function* (e) {
          while (e) {
            yield box(e);
            e = e.parentElement;
          }
        })(panel?.parentElement)] });
        if (rows.length < 180 && now - start < 4e3) {
          this.frame = requestAnimationFrame(sample);
          return;
        }
        this.frame = null;
        this.result = { version: "0.3.13-b-f2", ua: navigator.userAgent, dpr: devicePixelRatio, rows };
        if (details?.isConnected) {
          details.querySelector("textarea").value = JSON.stringify(this.result);
          details.querySelector("summary").textContent = bilingual("Size evidence ready · select text to copy", "尺寸采样完成 · 选中文本复制");
          details.hidden = false;
        }
        const button2 = this.root.querySelector("[data-size-probe]");
        if (button2) button2.disabled = false;
      };
      this.frame = requestAnimationFrame(sample);
    }
    dispose() {
      this.epoch++;
      if (this.frame !== null) cancelAnimationFrame(this.frame);
      this.frame = null;
    }
  };

  // client/reference/src/controls.js
  var import_coreUi = __toESM(require_coreUi(), 1);
  var bindings = /* @__PURE__ */ new WeakMap();
  var activeNumbers = /* @__PURE__ */ new Set();
  var isNumber = (el) => el?.type === "number" || el?.hasAttribute?.("data-reference-number");
  function cancelNumberEdits() {
    for (const number of [...activeNumbers]) number.cancel();
  }
  function bindRange(input) {
    const abort2 = new AbortController();
    let gesture = null;
    const emit = () => input.dispatchEvent(new Event("input", { bubbles: true }));
    const finish = (commit) => {
      if (!gesture) return;
      const previous = gesture.value;
      gesture.events.abort();
      gesture = null;
      activeNumbers.delete(api);
      if (!commit) {
        input.value = previous;
        emit();
      }
    };
    const api = { cancel: () => finish(false), dispose() {
      finish(false);
      abort2.abort();
    } };
    input.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || input.disabled) return;
      finish(false);
      const events = new AbortController(), options = { signal: events.signal };
      gesture = { value: input.value, events };
      activeNumbers.add(api);
      for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) input.addEventListener(type, (ev) => {
        if (ev.pointerId === e.pointerId) finish(type === "pointerup");
      }, options);
      window.addEventListener("blur", api.cancel, options);
      window.addEventListener("resize", api.cancel, options);
    }, { signal: abort2.signal });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && gesture) {
        e.preventDefault();
        e.stopPropagation();
        finish(false);
      }
    }, { signal: abort2.signal });
    return api;
  }
  function bindNumber(input) {
    const abort2 = new AbortController(), options = { signal: abort2.signal };
    let start = input.value, editing = false, drag = null, dispatching = false, disposed = false, ignoreClick = false;
    input.dataset.referenceNumber = "";
    input.type = "text";
    input.inputMode = "decimal";
    input.classList.add("ui-number-input", "is-drag-ready");
    const step = () => Number(input.getAttribute("step")) > 0 ? Number(input.getAttribute("step")) : 1;
    const normalize = (raw) => {
      let n = raw.trim() === "" || !Number.isFinite(Number(raw)) ? Number(start) : Number(raw);
      if (!Number.isFinite(n)) n = 0;
      for (const [attr, fn] of [["min", Math.max], ["max", Math.min]]) if (input.hasAttribute(attr)) n = fn(n, Number(input.getAttribute(attr)));
      const p = String(step()).split(".")[1]?.length || 0;
      n = Number(n.toFixed(p));
      for (const [attr, fn] of [["min", Math.max], ["max", Math.min]]) if (input.hasAttribute(attr)) n = fn(n, Number(input.getAttribute(attr)));
      return String(n);
    };
    const emit = (type) => {
      dispatching = true;
      input.dispatchEvent(new Event(type, { bubbles: true }));
      dispatching = false;
    };
    const begin = () => {
      if (editing || drag) return;
      start = input.value;
      editing = true;
      activeNumbers.add(api);
      input.classList.add("is-editing-number");
    };
    const end = () => {
      editing = false;
      activeNumbers.delete(api);
      input.classList.remove("is-editing-number", "is-dragging-number");
    };
    const clearDrag = () => {
      if (!drag) return;
      const d = drag;
      drag = null;
      d.events.abort();
      if (input.hasPointerCapture?.(d.id)) input.releasePointerCapture(d.id);
      input.ownerDocument.body.style.userSelect = d.userSelect;
    };
    const cancel = () => {
      if (!editing && !drag) return;
      clearDrag();
      input.value = start;
      input.removeAttribute("aria-invalid");
      end();
      emit("input");
    };
    const commit = () => {
      if (!editing && !drag) return;
      clearDrag();
      if (input.value === start) {
        end();
        return;
      }
      const next = normalize(input.value), changed = Number(next) !== Number(start);
      input.value = next;
      input.removeAttribute("aria-invalid");
      end();
      if (changed) {
        emit("input");
        emit("change");
      }
    };
    const blurCommitted = () => {
      const current = input.ownerDocument.activeElement, keys2 = ["data-reg-value", "data-reg-curve-value", "data-axis", "data-pal-field", "data-cv-field", "data-cp-channel"];
      if (current === input || !input.isConnected && isNumber(current) && keys2.some((k) => input.hasAttribute(k)) && keys2.every((k) => input.getAttribute(k) === current.getAttribute(k))) current.blur();
    };
    const api = { cancel, dispose() {
      if (disposed) return;
      disposed = true;
      cancel();
      abort2.abort();
      activeNumbers.delete(api);
    } };
    input.addEventListener("focus", begin, options);
    input.addEventListener("blur", () => {
      if (!drag) commit();
    }, options);
    input.addEventListener("click", (e) => {
      if (ignoreClick) {
        ignoreClick = false;
        e.preventDefault();
        return;
      }
      begin();
      input.focus();
      input.select();
    }, options);
    input.addEventListener("input", (e) => {
      if (dispatching) return;
      begin();
      const text2 = input.value.trim(), n = Number(text2), invalid = !text2 || /^[+-]?\.?$/.test(text2) || /\.$/.test(text2) || !Number.isFinite(n) || input.hasAttribute("min") && n < Number(input.min) || input.hasAttribute("max") && n > Number(input.max);
      input.setAttribute("aria-invalid", String(invalid));
      if (invalid) e.stopImmediatePropagation();
    }, { ...options, capture: true });
    input.addEventListener("change", (e) => {
      if (!dispatching) {
        e.stopImmediatePropagation();
        commit();
      }
    }, { ...options, capture: true });
    input.addEventListener("keydown", (e) => {
      if (input.disabled || input.readOnly || e.isComposing || e.keyCode === 229) return;
      if (!["Enter", "Escape", "ArrowUp", "ArrowDown"].includes(e.key)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.key === "Escape") {
        cancel();
        input.blur();
      } else if (e.key === "Enter") {
        commit();
        blurCommitted();
      } else {
        begin();
        input.value = normalize(String((Number(input.value) || Number(start) || 0) + (e.key === "ArrowUp" ? 1 : -1) * step()));
        emit("input");
      }
    }, options);
    input.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || input.disabled || input.readOnly || editing || document.activeElement === input) return;
      e.preventDefault();
      start = input.value;
      const events = new AbortController(), o = { signal: events.signal };
      drag = { id: e.pointerId, x: e.clientX, started: false, events, userSelect: document.body.style.userSelect };
      activeNumbers.add(api);
      input.setPointerCapture?.(e.pointerId);
      const move = (ev) => {
        const d = drag;
        if (!d || ev.pointerId !== d.id) return;
        const delta = ev.clientX - d.x;
        if (!d.started && Math.abs(delta) < 4) return;
        d.started = true;
        document.body.style.userSelect = "none";
        input.classList.add("is-dragging-number");
        input.value = normalize(String(Number(start) + delta / 8 * step()));
        emit("input");
      };
      input.addEventListener("pointermove", move, o);
      input.addEventListener("pointerup", (ev) => {
        if (!drag || ev.pointerId !== drag.id) return;
        move(ev);
        const moved = drag.started;
        if (moved) {
          ignoreClick = true;
          commit();
        } else {
          clearDrag();
          activeNumbers.delete(api);
          input.focus();
          input.select();
        }
      }, o);
      for (const type of ["pointercancel", "lostpointercapture"]) input.addEventListener(type, (ev) => {
        if (drag && ev.pointerId === drag.id) cancel();
      }, o);
    }, options);
    window.addEventListener("blur", cancel, options);
    window.addEventListener("resize", cancel, options);
    return api;
  }
  function rangeNumber(value2, range) {
    return '<div class="reference-combo ref-range-number"><span class="ref-combo-value">' + value2 + "</span>" + range + "</div>";
  }
  function colorControl(hex2, preview) {
    return '<div class="reference-combo ref-color-control"><span class="ref-combo-value">' + hex2 + "</span>" + preview + "</div>";
  }
  function mountControls(root2) {
    let owned = bindings.get(root2);
    if (!owned) {
      owned = /* @__PURE__ */ new Map();
      bindings.set(root2, owned);
    }
    for (const [node2, binding] of owned) if (!root2.contains(node2)) {
      binding.dispose();
      owned.delete(node2);
    }
    for (const select of root2.querySelectorAll("select")) {
      if (owned.has(select)) {
        owned.get(select).sync();
        continue;
      }
      const component = window.CoreUI.enhanceSelect({ select, document: root2.ownerDocument, getControlRect: viewportRect });
      select.tabIndex = -1;
      select.setAttribute("aria-hidden", "true");
      const label2 = select.labels?.[0]?.cloneNode(true);
      label2?.querySelectorAll("select,.custom-select").forEach((el) => el.remove());
      const name2 = select.getAttribute("aria-label") || label2?.textContent?.trim() || select.id;
      component.trigger.setAttribute("aria-label", name2);
      component.trigger.dataset.referenceSelect = "";
      const events = new AbortController();
      select.addEventListener("change", () => {
        if (component.menu.contains(document.activeElement)) component.trigger.focus();
      }, { capture: true, signal: events.signal });
      component.menu.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          component.close(true);
        } else if (["ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)) {
          e.preventDefault();
          const items = [...component.viewport.querySelectorAll("button:not(:disabled)")], i = items.indexOf(document.activeElement);
          items[e.key === "Home" ? 0 : e.key === "End" ? items.length - 1 : (i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
        } else if (e.key === "Tab") component.close(false);
      }, { signal: events.signal });
      component.trigger.addEventListener("keydown", (e) => {
        if (["Enter", " "].includes(e.key) && component.trigger.getAttribute("aria-expanded") === "true") component.viewport.querySelector(".is-selected:not(:disabled),button:not(:disabled)")?.focus();
      }, { signal: events.signal });
      const dispose = component.dispose;
      owned.set(select, { sync: component.sync, dispose() {
        events.abort();
        dispose();
        select.removeAttribute("aria-hidden");
        select.removeAttribute("tabindex");
      } });
    }
    for (const input of root2.querySelectorAll("input[type=number]")) if (!owned.has(input)) owned.set(input, bindNumber(input));
    for (const input of root2.querySelectorAll("input[type=range]")) if (!owned.has(input)) owned.set(input, bindRange(input));
  }
  function disposeControls(root2) {
    const owned = bindings.get(root2);
    if (!owned) return;
    bindings.delete(root2);
    for (const b of owned.values()) b.dispose();
  }
  function closeSelect() {
    return window.CoreUI.closeSelectComponents();
  }

  // client/reference/src/lab/color-model.js
  var AXES = ["hsv-h", "hsv-s", "hsv-v", "rgb-r", "rgb-g", "rgb-b"];
  var CHANNELS = { h: { name: "Hue", max: 359, unit: "°" }, s: { name: "Saturation", max: 100, unit: "%" }, v: { name: "Brightness", max: 100, unit: "%" }, r: { name: "Red", max: 255, unit: "" }, g: { name: "Green", max: 255, unit: "" }, b: { name: "Blue", max: 255, unit: "" } };
  var clamp = (v, min = 0, max = 1) => Math.max(min, Math.min(max, v));
  var byte = (v) => Math.round(clamp(v, 0, 255));
  var hue = (v) => (v % 360 + 360) % 360;
  function fromRGB(rgb, alpha = 1, previous) {
    const [r, g, b] = rgb.map(byte), hi = Math.max(r, g, b) / 255, lo = Math.min(r, g, b) / 255, d = hi - lo;
    let h = previous?.h || 0;
    if (d) {
      if (hi === r / 255) h = (g - b) / 255 / d % 6;
      else if (hi === g / 255) h = (b - r) / 255 / d + 2;
      else h = (r - g) / 255 / d + 4;
      h = hue(h * 60);
    }
    return { r, g, b, h, s: hi === 0 ? previous?.s || 0 : d / hi, v: hi, a: clamp(alpha) };
  }
  function fromHSV(h, s, v, a = 1) {
    h = hue(h);
    s = clamp(s);
    v = clamp(v);
    const c = v * s, x = c * (1 - Math.abs(h / 60 % 2 - 1)), m = v - c;
    const rgb = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    return { r: byte((rgb[0] + m) * 255), g: byte((rgb[1] + m) * 255), b: byte((rgb[2] + m) * 255), h, s, v, a: clamp(a) };
  }
  function parseColor(text2, previous, allowAlpha = true) {
    const raw = String(text2).trim().replace(/^#/, "");
    if (!new RegExp(allowAlpha ? "^[0-9a-f]{6}([0-9a-f]{2})?$" : "^[0-9a-f]{6}$", "i").test(raw)) throw new Error(allowAlpha ? "Enter a 6-digit HEX color, or 8 digits with opacity." : "Enter a 6-digit HEX color.");
    return fromRGB([0, 2, 4].map((i) => parseInt(raw.slice(i, i + 2), 16)), raw.length === 8 ? parseInt(raw.slice(6, 8), 16) / 255 : previous?.a ?? 1, previous);
  }
  var toHex = (c, alpha = false) => "#" + [c.r, c.g, c.b, ...alpha ? [c.a * 255] : []].map((v) => byte(v).toString(16).padStart(2, "0")).join("").toUpperCase();
  var channelValue = (c, k) => k === "s" || k === "v" ? c[k] * 100 : c[k];
  function setChannel(c, k, value2) {
    if (!Number.isFinite(value2)) throw new Error("Invalid color channel.");
    if (k === "a") return { ...c, a: clamp(value2 / 100) };
    if (!CHANNELS[k]) throw new Error("Invalid color channel.");
    const n = clamp(value2, 0, CHANNELS[k].max);
    if (["h", "s", "v"].includes(k)) return fromHSV(k === "h" ? n : c.h, k === "s" ? n / 100 : c.s, k === "v" ? n / 100 : c.v, c.a);
    return fromRGB(["r", "g", "b"].map((key) => key === k ? n : c[key]), c.a, c);
  }
  var axisValue = (c, mode) => mode.startsWith("hsv") ? c[mode.at(-1)] / (mode === "hsv-h" ? 359 : 1) : c[mode.at(-1)] / 255;
  function planePoint(c, mode) {
    if (mode === "hsv-h") return { x: c.s, y: 1 - c.v };
    if (mode === "hsv-s") return { x: c.h / 359, y: 1 - c.v };
    if (mode === "hsv-v") return { x: c.h / 359, y: 1 - c.s };
    if (mode === "rgb-r") return { x: c.g / 255, y: 1 - c.b / 255 };
    if (mode === "rgb-g") return { x: c.r / 255, y: 1 - c.b / 255 };
    return { x: c.r / 255, y: 1 - c.g / 255 };
  }
  function fromPlane(c, mode, x, y) {
    x = clamp(x);
    y = clamp(y);
    if (mode === "hsv-h") return fromHSV(c.h, x, 1 - y, c.a);
    if (mode === "hsv-s") return fromHSV(x * 359, c.s, 1 - y, c.a);
    if (mode === "hsv-v") return fromHSV(x * 359, 1 - y, c.v, c.a);
    if (mode === "rgb-r") return fromRGB([c.r, x * 255, (1 - y) * 255], c.a, c);
    if (mode === "rgb-g") return fromRGB([x * 255, c.g, (1 - y) * 255], c.a, c);
    return fromRGB([x * 255, (1 - y) * 255, c.b], c.a, c);
  }
  var fromAxis = (c, mode, value2) => setChannel(c, mode.at(-1), clamp(value2) * CHANNELS[mode.at(-1)].max);
  var planeLabels = (mode) => ({ "hsv-h": ["Saturation", "Brightness"], "hsv-s": ["Hue", "Brightness"], "hsv-v": ["Hue", "Saturation"], "rgb-r": ["Green", "Blue"], "rgb-g": ["Red", "Blue"], "rgb-b": ["Red", "Green"] })[mode];
  function channelGradient(c, k) {
    const count = k === "h" ? 13 : 9;
    return `linear-gradient(to right,${Array.from({ length: count }, (_, i) => toHex(setChannel(c, k, i / (count - 1) * CHANNELS[k].max))).join(",")})`;
  }
  function planePixels(c, mode, width, height) {
    const bytes2 = new Uint8ClampedArray(width * height * 4), dx = Math.max(1, width - 1), dy = Math.max(1, height - 1);
    if (mode.startsWith("rgb")) {
      const fixed = { r: 0, g: 1, b: 2 }[mode.at(-1)], horizontal = fixed === 0 ? 1 : 0, vertical = fixed === 2 ? 1 : 2, value2 = c[mode.at(-1)];
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        bytes2[i + fixed] = value2;
        bytes2[i + horizontal] = Math.round(x / dx * 255);
        bytes2[i + vertical] = Math.round((1 - y / dy) * 255);
        bytes2[i + 3] = 255;
      }
      return bytes2;
    }
    const hueColors = new Float64Array(width * 3);
    for (let x = 0; x < width; x++) {
      const h = (mode === "hsv-h" ? c.h : x / dx * 359) / 60, t2 = 1 - Math.abs(h % 2 - 1), rgb = h < 1 ? [1, t2, 0] : h < 2 ? [t2, 1, 0] : h < 3 ? [0, 1, t2] : h < 4 ? [0, t2, 1] : h < 5 ? [t2, 0, 1] : [1, 0, t2];
      hueColors.set(rgb, x * 3);
    }
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const s = mode === "hsv-h" ? x / dx : mode === "hsv-s" ? c.s : 1 - y / dy, v = mode === "hsv-v" ? c.v : 1 - y / dy, chroma = v * s, base = v - chroma, i = (y * width + x) * 4;
      bytes2[i] = Math.round((hueColors[x * 3] * chroma + base) * 255);
      bytes2[i + 1] = Math.round((hueColors[x * 3 + 1] * chroma + base) * 255);
      bytes2[i + 2] = Math.round((hueColors[x * 3 + 2] * chroma + base) * 255);
      bytes2[i + 3] = 255;
    }
    return bytes2;
  }
  var ColorSession = class {
    constructor(rgb, alpha = 1) {
      this.initial = fromRGB(rgb.map((v) => v * 255), alpha);
      this.color = { ...this.initial };
    }
    get value() {
      return { rgb: [this.color.r, this.color.g, this.color.b].map((v) => v / 255), opacity: this.color.a };
    }
    get dirty() {
      return toHex(this.color, true) !== toHex(this.initial, true);
    }
    reset() {
      this.color = { ...this.initial };
    }
    channel(k, v) {
      this.color = setChannel(this.color, k, v);
    }
    plane(mode, x, y) {
      this.color = fromPlane(this.color, mode, x, y);
    }
    axis(mode, v) {
      this.color = fromAxis(this.color, mode, v);
    }
    hex(text2, allowAlpha = true) {
      this.color = parseColor(text2, this.color, allowAlpha);
    }
  };

  // client/reference/src/lab/tool-spring.js
  var MOTION = { pace: 0.85, response: 0.46 * 0.85, tapDamping: 1, pickerOpen: 0.34 * 0.85, pickerClose: 0.26 * 0.85 };
  var motionMs = (milliseconds) => milliseconds * MOTION.pace;
  function springStep(value2, velocity, target, dt, { response = MOTION.response, damping = 1 } = {}) {
    const w = 2 * Math.PI / response, y = value2 - target;
    if (damping === 1) {
      const b2 = velocity + w * y, e2 = Math.exp(-w * dt);
      return { value: target + (y + b2 * dt) * e2, velocity: (velocity - w * b2 * dt) * e2 };
    }
    const z = damping * w, wd = w * Math.sqrt(1 - damping * damping), b = (velocity + z * y) / wd, e = Math.exp(-z * dt), c = Math.cos(wd * dt), s = Math.sin(wd * dt);
    return { value: target + e * (y * c + b * s), velocity: e * ((b * wd - z * y) * c + (-y * wd - z * b) * s) };
  }

  // client/reference/src/lab/theme-colors.js
  var bytes = (rgb) => rgb.map((v) => Math.round(Math.max(0, Math.min(1, v)) * 255) / 255);
  var luminance = (rgb) => rgb.map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
  function contrast(a, b) {
    const x = luminance(a), y = luminance(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  }
  var hex = (rgb) => "#" + bytes(rgb).map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
  var parse = (h) => h.match(/../g).map((v) => parseInt(v, 16) / 255);
  function accentTokens(rgb, theme2 = "dark") {
    const light = theme2 === "light", surfaces = (light ? ["f5f5f7", "ededf0", "ffffff", "f4f4f7"] : ["101114", "0c0d10", "17181d", "1c1d23"]).map(parse), destination = light ? [0, 0, 0] : [1, 1, 1];
    const blend = (amount) => bytes(rgb.map((v, i) => v + (destination[i] - v) * amount));
    const valid = (color2) => surfaces.every((bg) => contrast(color2, bg) >= 4.5) && surfaces.every((bg) => contrast(color2, color2.map((v, i) => v * 0.14 + bg[i] * 0.86)) >= 4.5);
    let color = blend(0);
    if (!valid(color)) {
      let low = 0, high = 1;
      for (let i = 0; i < 24; i++) {
        const mid = (low + high) / 2;
        if (valid(blend(mid))) high = mid;
        else low = mid;
      }
      color = blend(high);
    }
    const dark = parse("101114"), white = [1, 1, 1], on = contrast(color, dark) >= contrast(color, white) ? dark : white;
    return { "--accent": hex(color), "--accent-fill": `rgba(${color.map((v) => Math.round(v * 255)).join(",")},.14)`, "--on-accent": hex(on), "--focus-ring": hex(color) };
  }

  // client/reference/src/lab/palette-model.js
  var SCHEMA_VERSION = 1;
  var clamp2 = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  var clone2 = (value2) => JSON.parse(JSON.stringify(value2));
  var uid = () => globalThis.crypto?.randomUUID?.() || `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  var hexToRgb = (hex2) => {
    const h = hex2.replace("#", "");
    if (!/^[0-9a-f]{6}$/i.test(h)) throw new Error("Enter a six-digit HEX color.");
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  };
  var rgbToHex = (rgb) => "#" + rgb.map((v) => Math.round(clamp2(v) * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
  var solid = (hex2 = "#B5ADE9") => ({ kind: "solid", colorSpace: "srgb", rgb: hexToRgb(hex2), opacity: 1 });
  function gradient(a = "#6D66CF", b = "#EBA88B", type = "linear") {
    return { kind: "gradient", type, colorSpace: "srgb", interpolation: "linear-srgb", colorStops: [{ id: uid(), offset: 0, rgb: hexToRgb(a) }, { id: uid(), offset: 1, rgb: hexToRgb(b) }], opacityStops: [{ id: uid(), offset: 0, opacity: 1 }, { id: uid(), offset: 1, opacity: 1 }], start: type === "radial" ? [0.5, 0.5] : [0, 0.5], end: [1, 0.5], highlightLength: 0, highlightAngle: 0 };
  }
  var slot = (name2, paint = solid()) => ({ id: uid(), name: name2, paint });
  var palette = (name2 = "Untitled palette", groupId = null) => ({ id: uid(), name: name2, groupId, slots: [] });
  function seedLibrary() {
    const groups = [{ id: "brand", name: "Brand" }, { id: "motion", name: "Motion" }, { id: "studies", name: "Studies" }];
    const make = (name2, groupId, slots) => ({ ...palette(name2, groupId), slots });
    const dusk = gradient("#393D75", "#F0B09C");
    dusk.colorStops.splice(1, 0, { id: uid(), offset: 0.54, rgb: hexToRgb("#B68BCB") });
    const halo = gradient("#B5ADE9", "#5C67A4", "radial");
    halo.opacityStops[1].opacity = 0;
    return { schemaVersion: 1, groups, palettes: [
      make("Vela · Core", "brand", [slot("Ink", solid("#17181D")), slot("Mist", solid("#E9E9EE")), slot("Iris", solid("#B5ADE9")), slot("Sage", solid("#A0C3B1")), slot("Iris light", gradient("#6D66CF", "#C5C1EF"))]),
      make("Afterglow", "motion", [slot("Dusk", dusk), slot("Ember", solid("#F0B09C")), slot("Twilight", solid("#393D75")), slot("Halo", halo)]),
      make("Atlantic", "studies", [slot("Deep", solid("#192E42")), slot("Tide", solid("#35788B")), slot("Foam", solid("#CCE2DD")), slot("Current", gradient("#193E57", "#92CEC5"))]),
      make("Monochrome", null, ["#101114", "#34353D", "#777A89", "#B6B8C3", "#F1F1F5"].map((hex2, i) => slot(`Neutral ${i + 1}`, solid(hex2))))
    ] };
  }
  function copyPalette(source) {
    const p = clone2(source);
    p.id = uid();
    p.name = p.name.slice(0, 75) + " copy";
    p.slots = p.slots.map(copySlot);
    return p;
  }
  function copySlot(source) {
    const s = clone2(source);
    s.id = uid();
    if (s.paint.kind === "gradient") for (const key of ["colorStops", "opacityStops"]) s.paint[key].forEach((stop) => stop.id = uid());
    return s;
  }
  function filterPalettes(data, { query = "", group = "all", type = "all" } = {}) {
    const q = query.trim().toLocaleLowerCase();
    return data.palettes.filter((p) => (group === "all" || (group === "none" ? p.groupId === null : p.groupId === group)) && (type === "all" || p.slots.some((s) => s.paint.kind === type)) && (!q || [p.name, data.groups.find((g) => g.id === p.groupId)?.name || "", ...p.slots.map((s) => s.name), ...p.slots.flatMap((s) => s.paint.kind === "solid" ? [rgbToHex(s.paint.rgb)] : s.paint.colorStops.map((c) => rgbToHex(c.rgb)))].join(" ").toLocaleLowerCase().includes(q)));
  }
  function removeGroup(data, id) {
    data.groups = data.groups.filter((g) => g.id !== id);
    data.palettes.forEach((p) => {
      if (p.groupId === id) p.groupId = null;
    });
  }
  var ordered = (stops) => [...stops].sort((a, b) => a.offset - b.offset);
  function sampleStops(stops, t2, key) {
    const list = ordered(stops);
    if (t2 < list[0].offset) return clone2(list[0][key]);
    let left = list[0];
    for (const right of list.slice(1)) {
      if (t2 < right.offset) {
        const u = (t2 - left.offset) / (right.offset - left.offset);
        return Array.isArray(left[key]) ? left[key].map((v, i) => v + (right[key][i] - v) * u) : left[key] + (right[key] - left[key]) * u;
      }
      left = right;
    }
    return clone2(left[key]);
  }
  function addStop(paint, channel, offset = 0.5) {
    const key = channel === "color" ? "colorStops" : "opacityStops", value2 = channel === "color" ? "rgb" : "opacity";
    if (paint[key].length >= 32) throw new Error("A gradient can have up to 32 stops per channel.");
    const stop = { id: uid(), offset: clamp2(offset), [value2]: sampleStops(paint[key], offset, value2) };
    paint[key].push(stop);
    return stop;
  }
  function setAngle(paint, degrees) {
    const r = degrees * Math.PI / 180, dx = Math.cos(r), dy = Math.sin(r), scale2 = 0.5 / Math.max(Math.abs(dx), Math.abs(dy));
    paint.start = [0.5 - dx * scale2, 0.5 - dy * scale2];
    paint.end = [0.5 + dx * scale2, 0.5 + dy * scale2];
  }
  var angleOf = (paint) => (Math.atan2(paint.end[1] - paint.start[1], paint.end[0] - paint.start[0]) * 180 / Math.PI + 360) % 360;
  function validateLibrary(data) {
    const fail = (message) => {
      throw new Error(message);
    }, ids = /* @__PURE__ */ new Set(), id = (value2) => {
      if (typeof value2 !== "string" || !/^[-_A-Za-z0-9]{1,100}$/.test(value2) || ids.has(value2)) fail("Invalid or duplicate identity.");
      ids.add(value2);
    };
    const name2 = (value2) => {
      if (typeof value2 !== "string" || !value2.trim() || value2.length > 80) fail("Names must contain 1–80 characters.");
    };
    const number = (v, a = 0, b = 1) => {
      if (typeof v !== "number" || !Number.isFinite(v) || v < a || v > b) fail("Color or geometry value is outside its range.");
    };
    const rgb = (value2) => {
      if (!Array.isArray(value2) || value2.length !== 3) fail("Invalid RGB color.");
      value2.forEach((v) => number(v));
    };
    if (!data || data.schemaVersion !== SCHEMA_VERSION || !Array.isArray(data.groups) || !Array.isArray(data.palettes) || data.groups.length > 100 || data.palettes.length > 200) fail("Unsupported palette library.");
    data.groups.forEach((g) => {
      id(g.id);
      name2(g.name);
    });
    data.palettes.forEach((p) => {
      id(p.id);
      name2(p.name);
      if (p.groupId !== null && !data.groups.some((g) => g.id === p.groupId)) fail("Palette group does not exist.");
      if (!Array.isArray(p.slots) || p.slots.length > 64) fail("A palette supports up to 64 slots.");
      p.slots.forEach((s) => {
        id(s.id);
        name2(s.name);
        const a = s.paint;
        if (!a || a.colorSpace !== "srgb") fail("Unsupported color space.");
        if (a.kind === "solid") {
          rgb(a.rgb);
          number(a.opacity);
          return;
        }
        if (a.kind !== "gradient" || !["linear", "radial"].includes(a.type) || a.interpolation !== "linear-srgb") fail("Unsupported paint type.");
        for (const key of ["colorStops", "opacityStops"]) {
          if (!Array.isArray(a[key]) || a[key].length < 2 || a[key].length > 32) fail("Each gradient channel needs 2–32 stops.");
          a[key].forEach((stop) => {
            id(stop.id);
            number(stop.offset);
            key === "colorStops" ? rgb(stop.rgb) : number(stop.opacity);
          });
        }
        for (const point of [a.start, a.end]) {
          if (!Array.isArray(point) || point.length !== 2) fail("Invalid gradient point.");
          point.forEach((v) => number(v, -2, 3));
        }
        if (Math.hypot(a.start[0] - a.end[0], a.start[1] - a.end[1]) < 1e-4) fail("Gradient start and end must differ.");
        number(a.highlightLength, -0.99, 0.99);
        number(a.highlightAngle, -360, 360);
      });
    });
    return data;
  }
  function shapePaint(paint, { width = 1920, height = 1080 } = {}) {
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) throw new Error("Shape dimensions must be positive.");
    if (paint.kind === "solid") return { schema: "lomond.shape-paint/1", kind: "fill", colorSpace: "srgb", color: clone2(paint.rgb), opacity: paint.opacity * 100 };
    return { schema: "lomond.shape-paint/1", kind: "gradient-fill", type: paint.type, colorSpace: paint.colorSpace, interpolation: paint.interpolation, coordinateSpace: "shape-local", bounds: { width, height }, startPoint: [(paint.start[0] - 0.5) * width, (paint.start[1] - 0.5) * height], endPoint: [(paint.end[0] - 0.5) * width, (paint.end[1] - 0.5) * height], highlightLength: paint.highlightLength * 100, highlightAngle: paint.highlightAngle, colorStops: ordered(paint.colorStops).map(({ offset, rgb }) => ({ position: offset, color: clone2(rgb) })), opacityStops: ordered(paint.opacityStops).map(({ offset, opacity }) => ({ position: offset, opacity: opacity * 100 })) };
  }
  function paintSVG(paint, width = 240, height = 112, ramp = false) {
    const outer = (content) => `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">${content}</svg>`;
    if (paint.kind === "solid") return outer(`<rect width="100%" height="100%" fill="${rgbToHex(paint.rgb)}" opacity="${paint.opacity}"/>`);
    const start = ramp ? [0, 0.5] : paint.start, end = ramp ? [1, 0.5] : paint.end, s = [start[0] * width, start[1] * height], e = [end[0] * width, end[1] * height], radius = Math.hypot(e[0] - s[0], e[1] - s[1]), radial = !ramp && paint.type === "radial", angle = Math.atan2(e[1] - s[1], e[0] - s[0]) + paint.highlightAngle * Math.PI / 180;
    const tag = radial ? "radialGradient" : "linearGradient", geometry = radial ? `cx="${s[0]}" cy="${s[1]}" r="${radius}" fx="${s[0] + Math.cos(angle) * radius * paint.highlightLength}" fy="${s[1] + Math.sin(angle) * radius * paint.highlightLength}"` : `x1="${s[0]}" y1="${s[1]}" x2="${e[0]}" y2="${e[1]}"`;
    const grad = (id, stops) => `<${tag} id="${id}" gradientUnits="userSpaceOnUse" color-interpolation="sRGB" ${geometry}>${stops}</${tag}>`;
    const colors = ordered(paint.colorStops).map((c) => `<stop offset="${c.offset}" stop-color="${rgbToHex(c.rgb)}"/>`).join("");
    const alpha = ordered(paint.opacityStops).map((c) => `<stop offset="${c.offset}" stop-color="white" stop-opacity="${c.opacity}"/>`).join("");
    return outer(`<defs>${grad("c", colors)}${grad("a", alpha)}<mask id="m" maskUnits="userSpaceOnUse" x="0" y="0" width="${width}" height="${height}" style="mask-type:alpha"><rect width="100%" height="100%" fill="url(#a)"/></mask></defs><rect width="100%" height="100%" fill="url(#c)" mask="url(#m)"/>`);
  }
  var paintURL = (paint, w = 240, h = 112, ramp = false) => "data:image/svg+xml," + encodeURIComponent(paintSVG(paint, w, h, ramp));

  // client/reference/src/lab/curve-presets.js
  var COMPACT_BASE = { "Quad": [{ "t": 0, "v": 0, "in": null, "out": [0.3333333333, 0], "interpolation": "bezier" }, { "t": 1, "v": 1, "in": [0.6666666667, 0.3333333333], "out": null, "interpolation": "bezier" }], "Cubic": [{ "t": 0, "v": 0, "in": null, "out": [0.3333333333, 0], "interpolation": "bezier" }, { "t": 1, "v": 1, "in": [0.6666666667, 0], "out": null, "interpolation": "bezier" }], "Quart": [{ "t": 0, "v": 0, "in": null, "out": [0.5096614292, 0], "interpolation": "bezier" }, { "t": 1, "v": 1, "in": [0.7420637492, 0], "out": null, "interpolation": "bezier" }], "Quint": [{ "t": 0, "v": 0, "in": null, "out": [0.6388321125, 0], "interpolation": "bezier" }, { "t": 1, "v": 1, "in": [0.7848960867, 0], "out": null, "interpolation": "bezier" }], "Sine": [{ "t": 0, "v": 0, "in": null, "out": [0.3602897034, 0], "interpolation": "bezier" }, { "t": 1, "v": 1, "in": [0.6710549658, 0.4827802823], "out": null, "interpolation": "bezier" }], "Expo": [{ "t": 0, "v": 0, "in": null, "out": [0.6874858254, 0.0046581511], "interpolation": "bezier" }, { "t": 1, "v": 1, "in": [0.848944493, 0], "out": null, "interpolation": "bezier" }], "Circ": [{ "t": 0, "v": 0, "in": null, "out": [0.5484908349, 0], "interpolation": "bezier" }, { "t": 1, "v": 1, "in": [0.99899, 0.4433831079], "out": null, "interpolation": "bezier" }], "Back": [{ "t": 0, "v": 0, "in": null, "out": [0.3333333333, 0], "interpolation": "bezier" }, { "t": 1, "v": 1, "in": [0.6666666667, -0.5671933333], "out": null, "interpolation": "bezier" }] };
  var COMPACT_RESPONSE = { "Elastic In": [{ "t": 0, "v": 0, "in": null, "out": [0.7649354724, 0.0109566023], "interpolation": "bezier" }, { "t": 0.7657011736, "v": 0.0842189386, "in": [0.7649278154, 0.0900641418], "out": [0.927700461, -1.1402056169], "interpolation": "bezier" }, { "t": 1, "v": 1, "in": [0.9332007777, 0.5370786592], "out": null, "interpolation": "bezier" }], "Elastic Out": [{ "t": 0, "v": 0, "in": null, "out": [0.0667993566, 0.4629222711], "interpolation": "bezier" }, { "t": 0.2342989746, "v": 0.9157808684, "in": [0.0722993495, 2.1402051094], "out": [0.2350723326, 0.90993568], "interpolation": "bezier" }, { "t": 1, "v": 1, "in": [0.2350646756, 0.9890433998], "out": null, "interpolation": "bezier" }], "Elastic In Out": [{ "t": 0, "v": 0, "in": null, "out": [0.4994949928, 0.1999997302], "interpolation": "bezier" }, { "t": 0.5, "v": 0.5, "in": [0.4397794939, -0.5729044604], "out": [0.5602205061, 1.5729044604], "interpolation": "bezier" }, { "t": 1, "v": 1, "in": [0.5005050072, 0.8000002698], "out": null, "interpolation": "bezier" }], "Soft spring": [{ "t": 0, "v": 0, "in": null, "out": [0.0821147868, 0], "interpolation": "bezier" }, { "t": 0.3543035373, "v": 0.9581632903, "in": [0.1713924052, 0.7759384943], "out": [0.4838786869, 1.087252236], "interpolation": "bezier" }, { "t": 1, "v": 1, "in": [0.554719204, 1], "out": null, "interpolation": "bezier" }], "Gentle spring": [{ "t": 0, "v": 0, "in": null, "out": [0.0859218447, 0], "interpolation": "bezier" }, { "t": 0.3826463964, "v": 1.0687166735, "in": [0.153635101, 1.1340334348], "out": [0.7299122808, 0.9696722887], "interpolation": "bezier" }, { "t": 1, "v": 1, "in": [0.5879051266, 1], "out": null, "interpolation": "bezier" }], "Bouncy spring": [{ "t": 0, "v": 0, "in": null, "out": [0.0863759755, 0], "interpolation": "bezier" }, { "t": 0.3287867628, "v": 1.2046257074, "in": [0.1559188847, 1.4535236465], "out": [0.6229083318, 0.7811447627], "interpolation": "bezier" }, { "t": 1, "v": 1, "in": [0.4154851371, 1], "out": null, "interpolation": "bezier" }], "Elastic spring": [{ "t": 0, "v": 0, "in": null, "out": [0.0986628246, 0], "interpolation": "bezier" }, { "t": 0.3529353074, "v": 0.7775067251, "in": [0.1086751401, 2.5266944436], "out": [0.3535888428, 0.7728266496], "interpolation": "bezier" }, { "t": 1, "v": 1, "in": [0.3535823721, 1], "out": null, "interpolation": "bezier" }], "Critical spring": [{ "t": 0, "v": 0, "in": null, "out": [0.0618248226, 0], "interpolation": "bezier" }, { "t": 0.2910831115, "v": 0.7874332221, "in": [0.1363252705, 0.5480294113], "out": [0.4188276155, 0.9850485472], "interpolation": "bezier" }, { "t": 1, "v": 1, "in": [0.5547626081, 1], "out": null, "interpolation": "bezier" }], "Heavy spring": [{ "t": 0, "v": 0, "in": null, "out": [0.0620865564, 0], "interpolation": "bezier" }, { "t": 0.4372222907, "v": 0.8745045801, "in": [0.1211735291, 0.6650092802], "out": [0.6157801755, 0.9928630177], "interpolation": "bezier" }, { "t": 1, "v": 1, "in": [0.9278442496, 1], "out": null, "interpolation": "bezier" }] };

  // client/reference/src/lab/curve-model.js
  var curveNode = (t2, v, interpolation = "bezier") => ({ id: uid(), t: t2, v, in: null, out: null, interpolation });
  function bezierCurve(name2, x1 = 0.25, y1 = 0.1, x2 = 0.25, y2 = 1, groupId = "basic") {
    const a = curveNode(0, 0), b = curveNode(1, 1);
    a.out = [x1, y1];
    b.in = [x2, y2];
    return { id: uid(), name: name2, groupId, tags: [], durationMs: 600, nodes: [a, b] };
  }
  var cvCubic = (a, b, c, d, u) => {
    const q = 1 - u;
    return q * q * q * a + 3 * q * q * u * b + 3 * q * u * u * c + u * u * u * d;
  };
  function curveSegment(a, b) {
    return [[a.t, a.v], a.out || [a.t + (b.t - a.t) / 3, a.v + (b.v - a.v) / 3], b.in || [b.t - (b.t - a.t) / 3, b.v - (b.v - a.v) / 3], [b.t, b.v]];
  }
  function curveParameter(points, t2) {
    let lo = 0, hi = 1;
    for (let i = 0; i < 36; i++) {
      const u = (lo + hi) / 2;
      if (cvCubic(...points.map((p) => p[0]), u) < t2) lo = u;
      else hi = u;
    }
    return (lo + hi) / 2;
  }
  function evaluateCurve(curve, t2) {
    const n = curve.nodes;
    t2 = clamp2(t2);
    if (t2 <= 0) return n[0].v;
    if (t2 >= 1) return n.at(-1).v;
    let i = 0;
    while (i < n.length - 2 && n[i + 1].t <= t2) i++;
    const a = n[i], b = n[i + 1];
    if (a.interpolation === "hold") return a.v;
    if (a.interpolation === "linear") return a.v + (b.v - a.v) * (t2 - a.t) / (b.t - a.t);
    const points = curveSegment(a, b);
    return cvCubic(...points.map((p) => p[1]), curveParameter(points, t2));
  }
  function curveSlope(curve, t2) {
    const e = 1e-5, a = Math.max(0, t2 - e), b = Math.min(1, t2 + e);
    return (evaluateCurve(curve, b) - evaluateCurve(curve, a)) / (b - a);
  }
  function curveBounds(curve) {
    const ys = curve.nodes.flatMap((n) => [n.v, ...n.in ? [n.in[1]] : [], ...n.out ? [n.out[1]] : []]), min = Math.min(0, ...ys), max = Math.max(1, ...ys), pad = Math.max(0.12, (max - min) * 0.08);
    return { min: min - pad, max: max + pad };
  }
  function curvePath(curve, { width = 320, height = 180, pad = 12, bounds = curveBounds(curve) } = {}) {
    const point = ([x, y]) => `${pad + x * (width - pad * 2)},${pad + (bounds.max - y) / (bounds.max - bounds.min) * (height - pad * 2)}`;
    let path2 = `M${point([curve.nodes[0].t, curve.nodes[0].v])}`;
    for (let i = 0; i < curve.nodes.length - 1; i++) {
      const a = curve.nodes[i], b = curve.nodes[i + 1], p = curveSegment(a, b);
      path2 += a.interpolation === "hold" ? `L${point([b.t, a.v])}L${point([b.t, b.v])}` : a.interpolation === "linear" ? `L${point([b.t, b.v])}` : `C${point(p[1])} ${point(p[2])} ${point(p[3])}`;
    }
    return path2;
  }
  function validateCurveLibrary(data) {
    const fail = (m) => {
      throw new Error(m);
    }, ids = /* @__PURE__ */ new Set(), id = (v) => {
      if (typeof v !== "string" || !/^[-_A-Za-z0-9]{1,100}$/.test(v) || ids.has(v)) fail("Invalid or duplicate curve identity.");
      ids.add(v);
    }, name2 = (v) => {
      if (typeof v !== "string" || !v.trim() || v.length > 80) fail("Use a name of 1–80 characters.");
    }, num = (v, a, b) => {
      if (!Number.isFinite(v) || v < a || v > b) fail("Curve coordinate is outside its range.");
    };
    if (!data || data.schemaVersion !== 1 || !Array.isArray(data.groups) || !Array.isArray(data.curves) || data.groups.length > 100 || data.curves.length > 500) fail("Unsupported curve library.");
    data.groups.forEach((g) => {
      id(g.id);
      name2(g.name);
    });
    data.curves.forEach((c) => {
      id(c.id);
      name2(c.name);
      if (c.groupId !== null && !data.groups.some((g) => g.id === c.groupId)) fail("Curve group does not exist.");
      if (!Array.isArray(c.tags) || c.tags.length > 12 || c.tags.some((t2) => typeof t2 !== "string" || t2.length > 40)) fail("Invalid curve tags.");
      num(c.durationMs, 80, 1e4);
      if (!Array.isArray(c.nodes) || c.nodes.length < 2 || c.nodes.length > 128) fail("Use 2–128 curve points.");
      c.nodes.forEach((n, i) => {
        id(n.id);
        num(n.t, 0, 1);
        num(n.v, -2, 3);
        if (i && n.t - c.nodes[i - 1].t < 1e-5) fail("Point times must increase.");
        if (!["bezier", "linear", "hold"].includes(n.interpolation)) fail("Unknown interpolation.");
        for (const [k, lo, hi] of [["in", c.nodes[i - 1]?.t ?? n.t, n.t], ["out", n.t, c.nodes[i + 1]?.t ?? n.t]]) if (n[k] !== null) {
          if (!Array.isArray(n[k]) || n[k].length !== 2) fail("Invalid control handle.");
          num(n[k][0], lo, hi);
          num(n[k][1], -4, 5);
        }
      });
      if (c.nodes[0].t !== 0 || c.nodes[0].v !== 0 || c.nodes.at(-1).t !== 1 || c.nodes.at(-1).v !== 1) fail("Curve endpoints must be (0,0) and (1,1).");
    });
    return data;
  }
  function duplicateCurve(curve) {
    const c = clone2(curve);
    c.id = uid();
    c.name = c.name.slice(0, 75) + " copy";
    c.nodes.forEach((n) => n.id = uid());
    return c;
  }
  function filterCurves(data, { query = "", group = "all" } = {}) {
    const q = query.toLowerCase().trim();
    return data.curves.filter((c) => (group === "all" || (group === "none" ? c.groupId === null : c.groupId === group)) && (!q || [c.name, ...c.tags, data.groups.find((g) => g.id === c.groupId)?.name || ""].join(" ").toLowerCase().includes(q)));
  }
  function splitCurve(curve, index, t2) {
    if (curve.nodes.length >= 128) throw new Error("A curve supports up to 128 points.");
    const a = curve.nodes[index], b = curve.nodes[index + 1];
    if (!b) return;
    t2 = t2 ?? (a.t + b.t) / 2;
    if (t2 <= a.t + 1e-5 || t2 >= b.t - 1e-5) throw new Error("Choose a time inside this segment.");
    const n = curveNode(t2, evaluateCurve(curve, t2), a.interpolation);
    if (a.interpolation === "bezier") {
      const p = curveSegment(a, b), u = curveParameter(p, t2), mix = (a2, b2) => a2.map((v, i) => v + (b2[i] - v) * u), q = [mix(p[0], p[1]), mix(p[1], p[2]), mix(p[2], p[3])], r = [mix(q[0], q[1]), mix(q[1], q[2])], s = mix(r[0], r[1]);
      a.out = q[0];
      n.in = r[0];
      n.out = r[1];
      n.t = s[0];
      n.v = s[1];
      b.in = q[2];
    }
    curve.nodes.splice(index + 1, 0, n);
    return n;
  }
  function removeCurvePoint(curve, index) {
    if (index <= 0 || index >= curve.nodes.length - 1) throw new Error("Keep the first and last points.");
    curve.nodes.splice(index, 1);
  }
  function moveCurvePoint(curve, index, t2, v) {
    const n = curve.nodes[index];
    if (index === 0 || index === curve.nodes.length - 1) return;
    const before = curve.nodes[index - 1], after = curve.nodes[index + 1], nt = clamp2(t2, before.t + 1e-4, after.t - 1e-4), nv = clamp2(v, -2, 3), dt = nt - n.t, dv = nv - n.v;
    n.t = nt;
    n.v = nv;
    for (const k of ["in", "out"]) if (n[k]) {
      n[k][0] = clamp2(n[k][0] + dt, k === "in" ? before.t : nt, k === "in" ? nt : after.t);
      n[k][1] = clamp2(n[k][1] + dv, -4, 5);
    }
    if (before.out) before.out[0] = Math.min(before.out[0], nt);
    if (after.in) after.in[0] = Math.max(after.in[0], nt);
  }
  function reverseCurve(curve) {
    if (curve.nodes.slice(0, -1).some((n) => n.interpolation === "hold")) throw new Error("Reverse is available for continuous curves.");
    curve.nodes = curve.nodes.reverse().map((n, i, list) => ({ ...n, t: 1 - n.t, v: 1 - n.v, in: n.out ? [1 - n.out[0], 1 - n.out[1]] : null, out: n.in ? [1 - n.in[0], 1 - n.in[1]] : null, interpolation: i < list.length - 1 ? list[i + 1].interpolation : "bezier" }));
  }
  var presetNodes = (nodes) => nodes.map((n) => ({ ...clone2(n), id: uid() }));
  var reflectedNodes = (nodes) => {
    const c = { nodes: presetNodes(nodes) };
    reverseCurve(c);
    return c.nodes;
  };
  var scaleNodes = (nodes, t0, v0, scale2) => nodes.map((n) => ({ ...n, t: t0 + n.t * scale2, v: v0 + n.v * scale2, in: n.in ? [t0 + n.in[0] * scale2, v0 + n.in[1] * scale2] : null, out: n.out ? [t0 + n.out[0] * scale2, v0 + n.out[1] * scale2] : null }));
  var joinHalves = (first, second) => {
    const a = scaleNodes(first, 0, 0, 0.5), b = scaleNodes(second, 0.5, 0.5, 0.5);
    a.at(-1).out = b[0].out;
    a.at(-1).interpolation = b[0].interpolation;
    return [...a, ...b.slice(1)];
  };
  function bounceOutNodes() {
    const d = 2.75, k = 7.5625, nodes = [];
    for (const [a, b, center, floor] of [[0, 1 / d, 0, 0], [1 / d, 2 / d, 1.5 / d, 0.75], [2 / d, 2.5 / d, 2.25 / d, 0.9375], [2.5 / d, 1, 2.625 / d, 0.984375]]) {
      const span = b - a, value2 = (t2) => k * (t2 - center) ** 2 + floor, slope = (t2) => 2 * k * (t2 - center);
      if (!nodes.length) nodes.push(curveNode(0, 0));
      nodes.at(-1).out = [a + span / 3, value2(a) + slope(a) * span / 3];
      const n = curveNode(b, 1);
      n.in = [b - span / 3, value2(b) - slope(b) * span / 3];
      nodes.push(n);
    }
    return nodes;
  }
  function seedCurveLibrary() {
    const groups = [["basic", "Essentials"], ["power", "Power"], ["smooth", "Smooth"], ["back", "Overshoot"], ["bounce", "Bounce"], ["elastic", "Elastic"], ["spring", "Spring"], ["steps", "Steps"]].map(([id, name2]) => ({ id, name: name2 })), curves2 = [];
    const add = (name2, x1, y1, x2, y2) => curves2.push(bezierCurve(name2, x1, y1, x2, y2));
    add("Linear", 1 / 3, 1 / 3, 2 / 3, 2 / 3);
    curves2[0].nodes[0].interpolation = "linear";
    add("Ease", 0.25, 0.1, 0.25, 1);
    add("Ease In", 0.42, 0, 0.99899, 1 - 101e-5 / 0.58);
    add("Ease Out", 101e-5, 101e-5 / 0.58, 0.58, 1);
    add("Ease In Out", 0.42, 0, 0.58, 1);
    add("Easy Ease · zero speed", 1 / 3, 0, 2 / 3, 1);
    add("Soft UI", 0.22, 1, 0.36, 1);
    add("Snappy UI", 0.16, 1, 0.3, 1);
    add("Emphasized", 0.2, 0, 0, 1);
    add("Anticipate & settle", 0.5, -0.35, 0.4, 1.3);
    const insert = (name2, nodes, groupId, tags = []) => curves2.push({ id: uid(), name: name2, groupId, tags, durationMs: 700, nodes });
    for (const [label2, group] of [["Quad", "power"], ["Cubic", "power"], ["Quart", "power"], ["Quint", "power"], ["Sine", "smooth"], ["Expo", "smooth"], ["Circ", "smooth"], ["Back", "back"]]) {
      const inward = presetNodes(COMPACT_BASE[label2]), outward = reflectedNodes(inward);
      for (const direction of ["In", "Out", "In Out"]) insert(`${label2} ${direction}`, direction === "In" ? inward : direction === "Out" ? outward : joinHalves(presetNodes(inward), presetNodes(outward)), group, [label2.toLowerCase(), direction.toLowerCase()]);
    }
    const bounceOut = bounceOutNodes(), bounceIn = reflectedNodes(bounceOut);
    insert("Bounce In", bounceIn, "bounce", ["bounce", "in"]);
    insert("Bounce Out", bounceOut, "bounce", ["bounce", "out"]);
    insert("Bounce In Out", joinHalves(presetNodes(bounceIn), presetNodes(bounceOut)), "bounce", ["bounce", "in out"]);
    for (const [name2, nodes] of Object.entries(COMPACT_RESPONSE)) insert(name2, presetNodes(nodes), name2.endsWith("spring") ? "spring" : "elastic", [name2.toLowerCase(), "compact"]);
    for (const count of [1, 2, 3, 4, 6, 8, 12]) {
      const nodes = Array.from({ length: count + 1 }, (_, i) => curveNode(i / count, i / count, "hold"));
      curves2.push({ id: uid(), name: count === 1 ? "Hold / Step end" : `Steps ${count} · end`, groupId: "steps", tags: ["discrete", "hold"], durationMs: 800, nodes });
    }
    return validateCurveLibrary({ schemaVersion: 1, groups, curves: curves2 });
  }
  function curveToAE(curve, { startTime = 0, duration = 1, startValue = 0, endValue = 100 } = {}) {
    if (![startTime, duration, startValue, endValue].every(Number.isFinite) || duration <= 0) throw new Error("Use finite values and a positive duration.");
    const delta = endValue - startValue, make = (t2, v) => ({ time: startTime + t2 * duration, value: startValue + v * delta, inInterpolation: "LINEAR", outInterpolation: "LINEAR", inEase: null, outEase: null }), keys2 = [make(0, 0)], sampledSegments = [];
    for (let i = 0; i < curve.nodes.length - 1; i++) {
      const a = curve.nodes[i], b = curve.nodes[i + 1], left = keys2.at(-1), right = make(b.t, b.v), p = curveSegment(a, b), span = b.t - a.t, outDx = p[1][0] - a.t, inDx = b.t - p[2][0];
      if (a.interpolation === "hold") left.outInterpolation = "HOLD";
      else if (a.interpolation === "bezier") {
        if (outDx / span < 1e-3 || inDx / span < 1e-3) {
          sampledSegments.push(i);
          const count = Math.max(8, Math.ceil(span * 240));
          for (let j = 1; j < count; j++) {
            const t2 = a.t + span * j / count;
            keys2.push(make(t2, evaluateCurve(curve, t2)));
          }
        } else {
          left.outInterpolation = "BEZIER";
          right.inInterpolation = "BEZIER";
          left.outEase = { speed: delta / duration * (p[1][1] - a.v) / outDx, influence: outDx / span * 100 };
          right.inEase = { speed: delta / duration * (b.v - p[2][1]) / inDx, influence: inDx / span * 100 };
        }
      }
      keys2.push(right);
    }
    return { schema: "lomond.ae-temporal-plan/1", propertyScope: "scalar-nonspatial", mode: sampledSegments.length ? "mixed-sampled" : "temporal-handles", ...sampledSegments.length ? { sampledSegments, reason: "Segments with zero or sub-0.1% handles use sampled linear keys; other segments retain their interpolation." } : {}, keys: keys2 };
  }

  // client/reference/src/memory-store.js
  var copy2 = (value2) => JSON.parse(JSON.stringify(value2));
  var MemoryStore = class {
    constructor(data, validate = (value2) => value2) {
      this.validate = validate;
      this.validate(data);
      this.data = copy2(data);
      this.saved = copy2(data);
      this.listeners = /* @__PURE__ */ new Set();
      this.status = "saved";
      this.error = "";
      this.generation = 0;
      this.savedGeneration = 0;
      this.undoEntry = null;
      this.failSave = false;
      this.ready = Promise.resolve();
    }
    subscribe(fn) {
      this.listeners.add(fn);
      return () => this.listeners.delete(fn);
    }
    emit(kind = "render") {
      [...this.listeners].forEach((fn) => fn(kind));
    }
    change(fn, { kind = "render", undo = "" } = {}) {
      const next = copy2(this.data);
      fn(next);
      this.validate(next);
      this.undoEntry = undo ? { data: copy2(this.data), label: undo } : null;
      this.data = next;
      this.generation++;
      this.status = "unsaved";
      this.error = "";
      this.emit(kind);
    }
    get dirty() {
      return JSON.stringify(this.data) !== JSON.stringify(this.saved);
    }
    flush() {
      if (this.failSave) {
        this.status = "error";
        this.error = "Fixture save failed; your draft is retained.";
      } else {
        this.saved = copy2(this.data);
        this.savedGeneration = this.generation;
        this.status = "saved";
        this.error = "";
      }
      this.emit("status");
      return { accepted: true, applied: true, persisted: false, fixtureSaved: !this.failSave };
    }
    reload() {
      this.data = copy2(this.saved);
      this.undoEntry = null;
      this.generation = this.savedGeneration;
      this.status = "saved";
      this.error = "";
      this.emit();
    }
    undo() {
      if (!this.undoEntry) return;
      const value2 = this.undoEntry.data;
      this.change((next) => Object.assign(next, value2));
    }
    dispose() {
      this.listeners.clear();
    }
  };

  // client/reference/src/lab/palette-store.js
  var shared;
  var paletteStore = () => shared || (shared = new MemoryStore(seedLibrary(), validateLibrary));

  // client/reference/src/lab/asset-settings.js
  var seedAssetSettings = () => ({ schemaVersion: 1, motion: { curveId: null, durationMs: 400 }, appearance: { accent: null, toolFill: null } });
  function validateAssetSettings(data) {
    const id = (v) => typeof v === "string" && /^[-_A-Za-z0-9]{1,100}$/.test(v);
    if (!data || data.schemaVersion !== 1 || !data.motion || !data.appearance || !(data.motion.curveId === null || id(data.motion.curveId)) || !Number.isFinite(data.motion.durationMs) || data.motion.durationMs < 80 || data.motion.durationMs > 3e3) throw new Error("Invalid UI motion settings.");
    for (const ref of [data.appearance.accent, data.appearance.toolFill]) if (ref !== null && (!ref || !id(ref.paletteId) || !id(ref.slotId))) throw new Error("Invalid paint reference.");
    return data;
  }

  // client/reference/src/lab/curve-store.js
  var curves;
  var settings;
  var curveStore = () => curves || (curves = new MemoryStore(seedCurveLibrary(), validateCurveLibrary));
  var assetSettingsStore = () => settings || (settings = new MemoryStore(seedAssetSettings(), validateAssetSettings));

  // client/reference/src/lab/asset-runtime.js
  var started = false;
  var ready;
  var unsubscribers = [];
  var listeners = /* @__PURE__ */ new Set();
  function getCurve(id) {
    const curve = curveStore().data?.curves.find((c) => c.id === id);
    return curve ? clone2(curve) : null;
  }
  function getPaint(ref) {
    const paint = paletteStore().data?.palettes.find((p) => p.id === ref?.paletteId)?.slots.find((s) => s.id === ref.slotId)?.paint;
    return paint ? clone2(paint) : null;
  }
  function paintCSS(paint) {
    return paint.kind === "solid" ? `rgba(${paint.rgb.map((v) => Math.round(v * 255)).join(",")},${paint.opacity})` : `url("${paintURL(paint, 320, 320)}") center / cover`;
  }
  function activeMotion() {
    if (!started) return null;
    const data = assetSettingsStore().data, curve = data?.motion.curveId ? getCurve(data.motion.curveId) : null;
    return curve ? { curve, duration: data.motion.durationMs } : null;
  }
  function assetSummary() {
    const data = assetSettingsStore().data, c = data?.motion.curveId ? getCurve(data.motion.curveId) : null;
    return { motion: c?.name || copy("Default spring"), duration: data?.motion.durationMs || 400, status: assetSettingsStore().status, error: assetSettingsStore().error };
  }
  function observeAssets(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }
  function refreshAssets() {
    listeners.forEach((fn) => fn());
  }
  function appearanceSelection() {
    const data = assetSettingsStore().data;
    return { accent: getPaint(data.appearance.accent), fill: getPaint(data.appearance.toolFill) };
  }
  function initAssets() {
    if (started) return ready;
    started = true;
    const stores2 = [paletteStore(), curveStore(), assetSettingsStore()];
    stores2.forEach((store) => unsubscribers.push(store.subscribe(refreshAssets)));
    ready = Promise.all(stores2.map((s) => s.ready)).then(refreshAssets);
    return ready;
  }
  function disposeAssets() {
    unsubscribers.splice(0).forEach((fn) => fn());
    listeners.clear();
    started = false;
  }
  function useCurve(id, durationMs) {
    const store = assetSettingsStore();
    if (!store.data) throw new Error("UI settings are still loading.");
    if (id && !getCurve(id)) throw new Error("Choose an existing curve.");
    store.change((d) => {
      d.motion = { curveId: id, durationMs: clamp2(durationMs || 400, 80, 3e3) };
    });
  }
  function usePaint(ref, role) {
    const store = assetSettingsStore();
    if (!store.data) throw new Error("UI settings are still loading.");
    if (!["accent", "toolFill"].includes(role)) throw new Error("Unknown appearance role.");
    const paint = getPaint(ref);
    if (!paint) throw new Error("Choose an existing color slot.");
    if (role === "accent" && paint.kind !== "solid") throw new Error("Accent colors use a solid slot.");
    store.change((d) => d.appearance[role] = clone2(ref));
  }
  function resetPaint() {
    if (!assetSettingsStore().data) throw new Error("UI settings are still loading.");
    assetSettingsStore().change((d) => d.appearance = { accent: null, toolFill: null });
  }
  function motionTrack(spec, from, to, velocity = {}, continuous = false) {
    if (!spec) return null;
    return { spec: clone2(spec), from: { ...from }, to: { ...to }, velocity: { ...velocity }, continuous, elapsed: 0 };
  }
  function stepMotion(track, dt) {
    track.elapsed += Math.max(0, dt);
    const duration = track.spec.duration / 1e3, u = clamp2(track.elapsed / duration), e = evaluateCurve(track.spec.curve, u), slope = curveSlope(track.spec.curve, u), initial = curveSlope(track.spec.curve, 0), frame = {}, velocity = {};
    for (const key of Object.keys(track.to)) {
      const delta = track.to[key] - track.from[key], correction = track.continuous ? (track.velocity[key] || 0) * duration - delta * initial : 0;
      frame[key] = u === 1 ? track.to[key] : track.from[key] + delta * e + correction * u * (1 - u) ** 2;
      velocity[key] = u === 1 ? 0 : (delta * slope + correction * (1 - u) * (1 - 3 * u)) / duration;
    }
    return { frame, velocity, done: u === 1 };
  }

  // client/reference/src/lab/color-picker.js
  var esc2 = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  var icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m14 5 5 5M4 20l1-5L16 4a2.8 2.8 0 0 1 4 4L9 19zM3 21l2-2"/></svg>';
  var sessionAxis = "hsv-v";
  var preference = () => sessionAxis;
  function placeColorPopover(bounds, anchor, desired = { width: 288, height: 360 }) {
    const pad = 8, gap = 10, width = Math.min(desired.width, Math.max(0, bounds.width - pad * 2)), availableHeight = Math.max(0, bounds.height - pad * 2), right = anchor.left + anchor.width, bottom = anchor.top + anchor.height;
    let side, left, top, height;
    if (bounds.width - right - gap - pad >= width || anchor.left - gap - pad >= width) {
      side = bounds.width - right - gap - pad >= width ? "right" : "left";
      height = Math.min(desired.height, availableHeight);
      left = side === "right" ? right + gap : anchor.left - gap - width;
      top = clamp(anchor.top - 12, pad, Math.max(pad, bounds.height - pad - height));
    } else {
      const below = Math.max(0, bounds.height - pad - bottom - gap), above = Math.max(0, anchor.top - gap - pad);
      side = below >= desired.height || below >= above ? "bottom" : "top";
      height = Math.min(desired.height, side === "bottom" ? below : above);
      left = clamp(anchor.left, pad, Math.max(pad, bounds.width - pad - width));
      top = side === "bottom" ? bottom + gap : anchor.top - gap - height;
    }
    const x = clamp(anchor.left + anchor.width / 2 - left, 0, width), y = clamp(anchor.top + anchor.height / 2 - top, 0, height);
    return { left, top, width, height, side, origin: `${x}px ${y}px` };
  }
  var ColorPicker = class {
    constructor(host, { anchor = () => null, rgb, opacity = 1, allowAlpha = true, title = copy("Color"), snapshot, presence, onPreview = () => {
    }, onApply = () => {
    }, onCancel = () => {
    }, returnFocus } = {}) {
      Object.assign(this, { host, anchor, allowAlpha, title, onPreview, onApply, onCancel, returnFocus });
      this.session = new ColorSession(rgb, opacity);
      this.mode = AXES.includes(snapshot?.mode) ? snapshot.mode : preference();
      if (snapshot?.color) {
        const c = snapshot.color;
        this.session.color = fromHSV(c.h, c.s, c.v, allowAlpha ? c.a : 1);
      }
      this.abort = new AbortController();
      this.closed = false;
      this.disposed = false;
      this.sampling = false;
      this.presence = { value: 0, velocity: 0, ...presence || snapshot?.presence };
      this.presenceTarget = 1;
      this.presenceTime = performance.now();
      this.reduced = !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      this.presenceFrame = null;
      this.track = motionTrack(activeMotion(), { value: this.presence.value }, { value: 1 }, { value: this.presence.velocity }, !!(presence || snapshot?.presence));
      this.layer = document.createElement("div");
      this.layer.className = "color-picker-layer";
      this.layer.innerHTML = `<div class="cp-halo" aria-hidden="true"><span></span><span></span><span></span></div><section class="color-picker-panel" role="dialog" aria-label="${esc2(copy("Color picker: {title}", { title }))}"><header class="cp-header"><div><h4>${copy("Color picker")}</h4><p>${esc2(title)}</p></div><button type="button" data-cp-action="cancel" class="cp-close" aria-label="${copy("Cancel color edit")}">×</button></header><div class="cp-body"><div class="cp-content"><div class="cp-visual"><div class="cp-axes" aria-label="${copy("Color plane axis")}">${["hsv", "rgb"].map((f) => `<div role="group" aria-label="${copy("{family} axes", { family: f.toUpperCase() })}"><span>${f.toUpperCase()}</span>${[...f].map((k) => `<button type="button" data-cp-axis="${f}-${k}" aria-label="${copy("{axis} axis", { axis: copy(CHANNELS[k].name) })}" title="${copy("Hold {channel} constant in the plane", { channel: copy(CHANNELS[k].name) })}">${k.toUpperCase()}</button>`).join("")}</div>`).join("")}</div><div class="cp-plane" data-cp-plane tabindex="0" role="group" aria-roledescription="${copy("two-dimensional color field")}" aria-label="${copy("Color field; arrow keys to adjust, Shift for larger steps")}"><canvas aria-hidden="true"></canvas><span class="cp-plane-handle" aria-hidden="true"></span></div><div class="cp-plane-labels" aria-hidden="true"><span data-cp-y></span><span data-cp-x></span></div><label class="cp-axis-label"><span data-cp-axis-label></span><output data-cp-axis-value></output></label><input class="cp-range cp-axis-range" type="range" data-cp-field="axis" min="0" max="1000" step="1"><div class="cp-comparison"><button type="button" data-cp-action="reset" title="${copy("Restore original color")}"><span class="cp-checker"><i data-cp-original></i></span><span>${copy("Original")}</span></button><div><span class="cp-checker"><i data-cp-current></i></span><span>${copy("Current")}</span></div><button type="button" class="cp-pick" data-cp-action="pick">${icon}<span>${copy("Pick")}</span></button></div></div><div class="cp-values"><div class="cp-hex-row"><label><span>HEX</span><input data-cp-field="hex" aria-label="${copy("HEX color")}" spellcheck="false" maxlength="${allowAlpha ? 9 : 7}" autocomplete="off"></label><button type="button" data-cp-action="copy" title="${copy("Copy HEX")}">${copy("Copy")}</button></div><details class="cp-channel-details" ${snapshot?.expanded ? "open" : ""}><summary><span data-cp-family></span> ${copy("channels")}</summary><div class="cp-channel-fields">${Object.keys(CHANNELS).map((k) => `<label class="cp-channel" data-cp-row="${k}"><span title="${copy(CHANNELS[k].name)}">${k.toUpperCase()}</span>${rangeNumber(`<span class="cp-number"><input type="number" data-cp-channel="${k}" aria-label="${copy("{channel} value", { channel: copy(CHANNELS[k].name) })}" min="0" max="${CHANNELS[k].max}" step="1"><span>${CHANNELS[k].unit}</span></span>`, `<input type="range" class="cp-range" data-cp-channel="${k}" aria-label="${copy(CHANNELS[k].name)}" min="0" max="${CHANNELS[k].max}" step="1">`)}</label>`).join("")}${allowAlpha ? `<label class="cp-channel cp-alpha"><span title="${copy("Opacity")}">A</span>${rangeNumber(`<span class="cp-number"><input type="number" data-cp-channel="a" aria-label="${copy("Opacity value")}" min="0" max="100" step="1"><span>%</span></span>`, `<input type="range" class="cp-range" data-cp-channel="a" aria-label="${copy("Opacity")}" min="0" max="100" step="1">`)}</label>` : `<p class="cp-opacity-note">${copy("Opacity is controlled by the gradient’s opacity stops.")}</p>`}<p class="cp-help">${copy("Choose an axis, then drag in the color field. Arrow keys fine-tune; Shift makes larger steps.")}</p><p class="cp-pick-note"></p></div></details></div></div></div><footer class="cp-footer"><span class="cp-status" role="status">${copy("Not applied")}</span><div><button type="button" data-cp-action="cancel">${copy("Cancel")}</button><button type="button" data-cp-action="apply" class="primary-button">${copy("Apply")}</button></div></footer></section>`;
      host.append(this.layer);
      this.panel = this.query(".color-picker-panel");
      this.halo = this.query(".cp-halo");
      this.blurLayers = [...this.halo.children];
      this.anchor()?.setAttribute("aria-expanded", "true");
      const options = { signal: this.abort.signal };
      this.motionPreference = window.matchMedia?.("(prefers-reduced-motion: reduce)");
      this.motionPreference?.addEventListener("change", (event) => {
        this.reduced = event.matches;
        this.schedulePresence();
      }, options);
      this.layer.addEventListener("click", (e) => this.click(e), options);
      this.layer.addEventListener("input", (e) => this.input(e), options);
      this.layer.addEventListener("change", (e) => this.change(e), options);
      this.layer.addEventListener("keydown", (e) => this.keydown(e), options);
      this.layer.addEventListener("pointerdown", (e) => this.pointerdown(e), options);
      this.supported = typeof window.EyeDropper === "function";
      this.query('[data-cp-action="pick"]').disabled = !this.supported;
      this.query(".cp-pick-note").textContent = this.supported ? copy("Pick any screen color. Esc cancels sampling.") : copy("Screen picking isn’t available in this browser. Use the color field or enter HEX.");
      document.addEventListener("pointerdown", (e) => {
        if (!this.closed && !this.sampling && !this.layer.contains(e.target) && !this.anchor()?.contains(e.target)) this.cancel({ restoreFocus: false });
      }, { ...options, capture: true });
      this.layer.addEventListener("focusout", (e) => {
        if (!this.closed && !this.sampling && e.relatedTarget && !this.layer.contains(e.relatedTarget) && !this.anchor()?.contains(e.relatedTarget)) this.cancel({ restoreFocus: false });
      }, options);
      document.addEventListener("scroll", (e) => {
        if (!this.layer.contains(e.target)) this.schedulePosition();
      }, { ...options, capture: true });
      window.addEventListener("resize", () => this.schedulePosition(), options);
      this.query("details").addEventListener("toggle", () => this.schedulePosition(), options);
      if (typeof ResizeObserver === "function") {
        this.observer = new ResizeObserver(() => {
          this.schedulePosition();
          this.scheduleDraw();
        });
        this.observer.observe(host);
        this.observer.observe(this.panel);
        this.observer.observe(this.query("[data-cp-plane]"));
      }
      mountControls(this.layer);
      this.update();
      this.position();
      this.enter();
      this.query("[data-cp-plane]").focus({ preventScroll: true });
    }
    schedulePosition() {
      if (this.closed || this.positionRequest || !globalThis.requestAnimationFrame) return;
      this.positionRequest = requestAnimationFrame(() => {
        this.positionRequest = 0;
        this.position();
      });
    }
    position() {
      if (this.closed) return;
      const anchor = this.anchor();
      if (!anchor) return;
      const bounds = viewportRect(this.host), rect = viewportRect(anchor);
      if (!bounds.width || !bounds.height || !rect.width) return;
      const scroll = anchor.closest(".pal-detail") ? viewportRect(anchor.closest(".pal-detail")) : null;
      if (scroll && (rect.bottom <= scroll.top || rect.top >= scroll.bottom)) {
        this.cancel({ restoreFocus: false });
        return;
      }
      const sx = bounds.width / (this.host.clientWidth || bounds.width), sy = bounds.height / (this.host.clientHeight || bounds.height), w = bounds.width / sx, h = bounds.height / sy, a = { left: (rect.left - bounds.left) / sx, top: (rect.top - bounds.top) / sy, width: rect.width / sx, height: rect.height / sy };
      const cssHeight = (el) => parseFloat(getComputedStyle(el).height) || el.offsetHeight;
      const bodyStyle = getComputedStyle(this.query(".cp-body")), panelStyle = getComputedStyle(this.panel);
      const desired = Math.ceil(cssHeight(this.query(".cp-header")) + cssHeight(this.query(".cp-content")) + cssHeight(this.query(".cp-footer")) + parseFloat(bodyStyle.paddingTop) + parseFloat(bodyStyle.paddingBottom) + parseFloat(panelStyle.borderTopWidth) + parseFloat(panelStyle.borderBottomWidth));
      const pos = placeColorPopover({ width: w, height: h }, a, { width: 288, height: Math.min(desired || 360, 480) });
      this.layer.dataset.sizeWrites = String((this.positionWrites || 0) + 1);
      this.positionWrites = Number(this.layer.dataset.sizeWrites);
      this.layer.style.width = pos.width + "px";
      this.layer.style.maxHeight = pos.height + "px";
      this.layer.style.left = pos.left + "px";
      this.layer.style.top = pos.top + "px";
      this.panel.style.maxHeight = pos.height + "px";
      this.layer.dataset.side = pos.side;
      this.panel.style.transformOrigin = pos.origin;
      const [ox, oy] = pos.origin.split(" ").map(parseFloat);
      this.halo.style.transformOrigin = `${ox + 30}px ${oy + 30}px`;
      this.motionX = pos.side === "right" ? -7 : pos.side === "left" ? 7 : 0;
      this.motionY = pos.side === "bottom" ? -7 : pos.side === "top" ? 7 : 0;
      this.anchor()?.setAttribute("aria-expanded", "true");
      this.scheduleDraw();
    }
    query(selector) {
      return this.layer.querySelector(selector);
    }
    snapshot() {
      return { mode: this.mode, color: { ...this.session.color }, expanded: this.query("details").hasAttribute("open"), presence: this.capturePresence() };
    }
    capturePresence() {
      this.advancePresence(performance.now());
      return { ...this.presence };
    }
    enter() {
      this.paintPresence();
      this.schedulePresence();
    }
    advancePresence(now) {
      const dt = Math.max(0, (now - this.presenceTime) / 1e3);
      this.presenceTime = now;
      if (this.disposed || !dt) return;
      if (this.reduced) {
        const step = dt * 1e3 / motionMs(120), value2 = this.presence.value;
        this.presence = { value: this.presenceTarget ? Math.min(1, value2 + step) : Math.max(0, value2 - step), velocity: 0 };
      } else if (this.track) {
        const next = stepMotion(this.track, dt);
        this.presence = { value: next.frame.value, velocity: next.velocity.value };
      } else this.presence = springStep(this.presence.value, this.presence.velocity, this.presenceTarget, dt, { response: this.presenceTarget ? MOTION.pickerOpen : MOTION.pickerClose, damping: 1 });
    }
    paintPresence() {
      const p = clamp(this.presence.value), spatial = this.track ? this.presence.value : p, transform = this.reduced ? "none" : `translate(${(1 - spatial) * (this.motionX || 0)}px,${(1 - spatial) * (this.motionY || 0)}px) scale(${0.97 + 0.03 * spatial})`;
      this.panel.style.opacity = String(p);
      this.panel.style.transform = transform;
      this.halo.style.transform = transform;
      this.blurLayers.forEach((layer, i) => {
        layer.style.opacity = String(p);
        layer.style.setProperty("--blur", [3, 8, 16][i] * p + "px");
      });
    }
    schedulePresence() {
      if (this.disposed || this.presenceFrame !== null) return;
      if (typeof requestAnimationFrame !== "function") {
        this.presence = { value: this.presenceTarget, velocity: 0 };
        this.paintPresence();
        if (this.closed) this.remove();
        return;
      }
      this.presenceFrame = requestAnimationFrame((now) => {
        this.presenceFrame = null;
        if (this.disposed) return;
        this.advancePresence(now);
        const done = this.track && !this.reduced ? this.track.elapsed >= this.track.spec.duration / 1e3 : Math.abs(this.presence.value - this.presenceTarget) < 2e-3 && Math.abs(this.presence.velocity) < 0.02;
        if (done) this.presence = { value: this.presenceTarget, velocity: 0 };
        this.paintPresence();
        if (done) {
          if (this.closed) this.remove();
        } else this.schedulePresence();
      });
    }
    close() {
      if (this.closed) return this.closingPromise || Promise.resolve();
      this.capturePresence();
      this.stopInteraction();
      this.presenceTarget = 0;
      this.track = motionTrack(activeMotion(), { value: this.presence.value }, { value: 0 }, { value: this.presence.velocity }, Math.abs(this.presence.velocity) > 1e-3);
      this.layer.dataset.closing = "true";
      this.layer.inert = true;
      this.layer.style.pointerEvents = "none";
      this.layer.querySelectorAll("button,input,summary,[tabindex]").forEach((el) => el.setAttribute("tabindex", "-1"));
      this.layer.setAttribute("aria-hidden", "true");
      this.closingPromise = new Promise((resolve) => this.resolveClose = resolve);
      this.schedulePresence();
      return this.closingPromise;
    }
    stopInteraction() {
      disposeControls(this.layer);
      this.endPlane?.(false);
      this.closed = true;
      this.sampleAbort?.abort();
      this.abort.abort();
      this.observer?.disconnect();
      if (this.drawRequest) cancelAnimationFrame(this.drawRequest);
      if (this.positionRequest) cancelAnimationFrame(this.positionRequest);
      this.anchor()?.setAttribute("aria-expanded", "false");
    }
    remove() {
      if (this.disposed) return;
      this.disposed = true;
      if (this.presenceFrame !== null) cancelAnimationFrame(this.presenceFrame);
      this.presenceFrame = null;
      this.layer.remove();
      this.resolveClose?.();
      this.resolveClose = null;
    }
    setMode(mode) {
      if (!AXES.includes(mode)) return;
      this.mode = mode;
      sessionAxis = mode;
      this.update();
    }
    update(preview = false) {
      if (this.closed) return;
      const c = this.session.color, family = this.mode.slice(0, 3), axis = this.mode.at(-1);
      this.layer.querySelectorAll("[data-cp-axis]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.cpAxis === this.mode)));
      this.layer.querySelectorAll("[data-cp-row]").forEach((row) => row.hidden = !family.includes(row.dataset.cpRow));
      this.layer.querySelectorAll("[data-cp-channel]").forEach((input) => {
        const k = input.dataset.cpChannel, v = k === "a" ? c.a * 100 : channelValue(c, k);
        if (input !== document.activeElement || input.type === "range") input.value = Math.round(v);
        if (input.type === "range") input.style.background = k === "a" ? `linear-gradient(to right,${toHex(c)}00,${toHex(c)}),conic-gradient(#a8a8a8 25%,#ddd 0 50%,#a8a8a8 0 75%,#ddd 0) 0 / 10px 10px` : channelGradient(c, k);
      });
      this.query("[data-cp-family]").textContent = family.toUpperCase();
      const [x, y] = planeLabels(this.mode).map(copy);
      this.query("[data-cp-x]").textContent = x + " →";
      this.query("[data-cp-y]").textContent = "↑ " + y;
      const plane = this.query("[data-cp-plane]");
      plane.title = `${x}: ${Math.round(planePoint(c, this.mode).x * 100)}%, ${y}: ${Math.round((1 - planePoint(c, this.mode).y) * 100)}%`;
      const point = planePoint(c, this.mode), handle = this.query(".cp-plane-handle");
      handle.style.left = clamp(point.x) * 100 + "%";
      handle.style.top = clamp(point.y) * 100 + "%";
      handle.style.background = toHex(c);
      const strip = this.query('[data-cp-field="axis"]');
      strip.value = Math.round(clamp(axisValue(c, this.mode)) * 1e3);
      strip.style.background = channelGradient(c, axis);
      strip.setAttribute("aria-label", copy("{axis} axis", { axis: copy(CHANNELS[axis].name) }));
      strip.setAttribute("aria-valuetext", Math.round(channelValue(c, axis)) + CHANNELS[axis].unit);
      this.query("[data-cp-axis-label]").textContent = copy(CHANNELS[axis].name);
      this.query("[data-cp-axis-value]").textContent = Math.round(channelValue(c, axis)) + CHANNELS[axis].unit;
      this.query("[data-cp-original]").style.background = toHex(this.session.initial, true);
      this.query("[data-cp-current]").style.background = toHex(c, true);
      const hex2 = this.query('[data-cp-field="hex"]');
      if (hex2 !== document.activeElement) hex2.value = toHex(c, this.allowAlpha && c.a < 1);
      if (preview) {
        this.report(copy("Not applied"));
        this.onPreview(this.session.value);
      }
      this.scheduleDraw();
    }
    scheduleDraw() {
      if (this.drawRequest || !globalThis.requestAnimationFrame) return;
      this.drawRequest = requestAnimationFrame(() => {
        this.drawRequest = 0;
        this.draw();
      });
    }
    draw() {
      if (this.closed) return;
      const canvas = this.query("canvas"), plane = this.query(".cp-plane"), scale2 = viewportRect(this.host).width / this.host.offsetWidth || 1, dpr = Math.min((window.devicePixelRatio || 1) * scale2, 2), w = Math.min(640, Math.round(plane.clientWidth * dpr)), h = Math.min(400, Math.round(plane.clientHeight * dpr));
      if (!w || !h) return;
      const key = [this.mode, this.session.color[this.mode.at(-1)], w, h].join(":");
      if (key === this.drawKey) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      this.drawKey = key;
      canvas.dataset.sizeWrites = String((this.drawWrites || 0) + 1);
      this.drawWrites = Number(canvas.dataset.sizeWrites);
      canvas.width = w;
      canvas.height = h;
      const pixels = ctx.createImageData(w, h);
      pixels.data.set(planePixels(this.session.color, this.mode, w, h));
      ctx.putImageData(pixels, 0, 0);
    }
    report(text2, error = false) {
      text2 = copy(text2);
      const el = this.query(".cp-status");
      el.textContent = text2;
      el.dataset.error = String(error);
    }
    input(e) {
      const input = e.target, k = input.dataset.cpChannel;
      if (k) {
        if (input.value === "" || !Number.isFinite(Number(input.value)) || input.validity?.valid === false) return;
        this.session.channel(k, Number(input.value));
        this.update(true);
      } else if (input.dataset.cpField === "axis") {
        this.session.axis(this.mode, Number(input.value) / 1e3);
        this.update(true);
      } else if (input.dataset.cpField === "hex") {
        input.removeAttribute("aria-invalid");
      }
    }
    commitHex() {
      const input = this.query('[data-cp-field="hex"]');
      try {
        if (input.value !== toHex(this.session.color, this.allowAlpha && this.session.color.a < 1)) this.session.hex(input.value, this.allowAlpha);
        input.removeAttribute("aria-invalid");
        this.update(true);
        return true;
      } catch (error) {
        input.setAttribute("aria-invalid", "true");
        this.report(error.message, true);
        return false;
      }
    }
    change(e) {
      if (e.target.dataset.cpField === "hex") this.commitHex();
      else if (e.target.dataset.cpChannel) {
        const k = e.target.dataset.cpChannel;
        e.target.value = Math.round(k === "a" ? this.session.color.a * 100 : channelValue(this.session.color, k));
      }
    }
    click(e) {
      const axis = e.target.closest("[data-cp-axis]");
      if (axis) {
        this.setMode(axis.dataset.cpAxis);
        return;
      }
      const action = e.target.closest("[data-cp-action]")?.dataset.cpAction;
      if (action === "cancel") this.cancel();
      if (action === "apply") {
        if (!this.commitHex()) return;
        this.onApply(this.session.value);
      }
      if (action === "reset") {
        this.session.reset();
        this.query('[data-cp-field="hex"]').value = toHex(this.session.color, this.allowAlpha && this.session.color.a < 1);
        this.update(true);
      }
      if (action === "pick") this.pick();
      if (action === "copy") this.copy();
    }
    pointerdown(e) {
      const plane = e.target.closest("[data-cp-plane]");
      if (!plane || e.button !== 0) return;
      e.preventDefault();
      this.endPlane?.(false);
      plane.focus({ preventScroll: true });
      const before = { ...this.session.color }, events = new AbortController();
      plane.setPointerCapture?.(e.pointerId);
      const move = (event) => {
        if (event.pointerId !== e.pointerId || this.closed) return;
        const rect = viewportRect(plane);
        this.session.plane(this.mode, (event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height);
        this.update(true);
      };
      this.endPlane = (commit) => {
        events.abort();
        this.endPlane = null;
        if (plane.hasPointerCapture?.(e.pointerId)) plane.releasePointerCapture(e.pointerId);
        if (!commit) {
          this.session.color = before;
          this.update(true);
        }
      };
      plane.addEventListener("pointermove", move, { signal: events.signal });
      for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) plane.addEventListener(type, (event) => {
        if (event.pointerId === e.pointerId) {
          if (type === "pointerup") move(event);
          this.endPlane?.(type === "pointerup");
        }
      }, { signal: events.signal });
      window.addEventListener("blur", () => this.endPlane?.(false), { signal: events.signal });
      move(e);
    }
    keydown(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        if (this.sampling) this.sampleAbort?.abort();
        else this.cancel();
        return;
      }
      if (e.target.matches("[data-cp-plane]") && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        const p = planePoint(this.session.color, this.mode), step = e.shiftKey ? 0.05 : 1 / 255;
        this.session.plane(this.mode, p.x + (e.key === "ArrowRight" ? step : e.key === "ArrowLeft" ? -step : 0), p.y + (e.key === "ArrowDown" ? step : e.key === "ArrowUp" ? -step : 0));
        this.update(true);
      }
      if (e.key === "Enter" && e.target.matches('[data-cp-field="hex"]')) {
        e.preventDefault();
        this.commitHex();
      }
      if (e.key === "Tab") {
        const items = [...this.layer.querySelectorAll('button:not(:disabled),input,summary,[tabindex="0"]')].filter((el) => !el.closest("[hidden]") && (!el.closest("details:not([open])") || el.tagName === "SUMMARY")), first = items[0], last = items.at(-1);
        if (e.shiftKey && e.target === first || !e.shiftKey && e.target === last) {
          e.preventDefault();
          const anchor = this.anchor(), underlying = [...this.host.querySelectorAll('button:not(:disabled),input,select,summary,[tabindex="0"]')].filter((el) => !this.layer.contains(el) && !el.closest("[hidden]"));
          const next = e.shiftKey ? anchor : underlying[underlying.indexOf(anchor) + 1];
          this.cancel({ restoreFocus: false });
          (next || anchor)?.focus({ preventScroll: true });
        }
      }
    }
    async copy() {
      try {
        await navigator.clipboard.writeText(toHex(this.session.color, this.allowAlpha && this.session.color.a < 1));
        if (!this.closed) this.report(copy("HEX copied."));
      } catch {
        if (!this.closed) {
          this.query('[data-cp-field="hex"]').select();
          this.report(copy("Select and copy the HEX value."));
        }
      }
    }
    async pick() {
      if (!this.supported || this.sampling || this.closed) return;
      this.sampling = true;
      const abort2 = new AbortController();
      this.sampleAbort = abort2;
      this.query('[data-cp-action="pick"]').disabled = true;
      this.report(copy("Pick a screen color · Esc to cancel"));
      try {
        const result = await new window.EyeDropper().open({ signal: abort2.signal });
        if (this.closed || abort2.signal.aborted) return;
        this.session.hex(result.sRGBHex, false);
        this.update(true);
      } catch (error) {
        if (!this.closed) this.report(error.name === "AbortError" ? copy("Sampling cancelled. Your draft is kept.") : copy("Screen picking failed. Try again or enter HEX."), error.name !== "AbortError");
      } finally {
        this.sampling = false;
        if (!this.closed) this.query('[data-cp-action="pick"]').disabled = !this.supported;
      }
    }
    cancel(options) {
      if (this.closed) return;
      this.onCancel(options);
    }
    destroy({ restoreFocus: restoreFocus2 = true } = {}) {
      if (this.disposed) return;
      this.stopInteraction();
      this.remove();
      if (restoreFocus2) this.returnFocus?.();
    }
  };

  // client/reference/src/lab/registry-curve.js
  var CURVE_HEIGHT = { min: 120, default: 160, max: 480 };
  var clamp3 = (n, min, max) => Math.max(min, Math.min(max, n));
  var cubic = (a, b, t2) => 3 * (1 - t2) ** 2 * t2 * a + 3 * (1 - t2) * t2 * t2 * b + t2 ** 3;
  var derivative = (a, b, t2) => 3 * (1 - t2) ** 2 * a + 6 * (1 - t2) * t2 * (b - a) + 3 * t2 * t2 * (1 - b);
  function endpointSpeed(c, point) {
    const dx = point === 1 ? c.x1 : 1 - c.x2, dy = point === 1 ? c.y1 : 1 - c.y2;
    if (dx > 1e-10) return dy / dx;
    if (Math.abs(dy) > 1e-10) return Math.sign(dy) * Infinity;
    const nextX = point === 1 ? c.x2 : 1 - c.x1, nextY = point === 1 ? c.y2 : 1 - c.y1;
    return nextX > 1e-10 ? nextY / nextX : Math.abs(nextY) > 1e-10 ? Math.sign(nextY) * Infinity : 1;
  }
  function curveGeometry(c, mode = "progress", size = {}, range) {
    const width = Math.max(160, size.width || 300), height = clamp3(size.height || CURVE_HEIGHT.default, CURVE_HEIGHT.min, CURVE_HEIGHT.max);
    const left = 32, right = width - 42, top = 16, bottom = height - 24, plotWidth = right - left;
    const samples = mode === "speed" ? Array.from({ length: 161 }, (_, i) => {
      const t2 = (i + 1e-3) / 160.002;
      return { x: cubic(c.x1, c.x2, t2), v: derivative(c.y1, c.y2, t2) / Math.max(1e-7, derivative(c.x1, c.x2, t2)) };
    }) : [];
    const endpoints = [endpointSpeed(c, 1), endpointSpeed(c, 2)].filter(Number.isFinite);
    const lo = mode === "speed" ? Math.min(0, ...samples.map((p) => p.v), ...endpoints) : Math.min(0, c.y1, c.y2), hi = mode === "speed" ? Math.max(1, ...samples.map((p) => p.v), ...endpoints) : Math.max(1, c.y1, c.y2);
    const pad = (hi - lo) * 0.1, min = range?.min ?? lo - pad, max = range?.max ?? hi + pad;
    const x = (t2) => left + t2 * plotWidth, y = (v) => bottom - (v - min) / (max - min) * (bottom - top);
    const path2 = mode === "speed" ? samples.map((p, i) => `${i ? "L" : "M"}${x(p.x).toFixed(3)},${y(p.v).toFixed(3)}`).join(" ") : `M${x(0)},${y(0)} C${x(c.x1)},${y(c.y1)} ${x(c.x2)},${y(c.y2)} ${x(1)},${y(1)}`;
    return { min, max, lo, hi, x, y, path: path2, width, height, left, right, top, bottom, plotWidth, unX: (px) => (px - left) / plotWidth, unY: (py) => min + (bottom - py) / (bottom - top) * (max - min) };
  }
  function influenceTrack(g) {
    return { start: 9, end: Math.max(10, Math.min(g.plotWidth * 0.49, g.plotWidth / 2 - 11)) };
  }
  function speedHandle(c, point, g) {
    const influence = point === 1 ? c.x1 : 1 - c.x2, speed = endpointSpeed(c, point), track = influenceTrack(g), distance = track.start + (track.end - track.start) * influence;
    const displaySpeed = Number.isFinite(speed) ? speed : speed > 0 ? g.max : g.min;
    return { influence, speed, x: g.x(point === 1 ? 0 : 1) + (point === 1 ? distance : -distance), y: g.y(displaySpeed), anchorX: g.x(point === 1 ? 0 : 1), anchorY: g.y(displaySpeed) };
  }
  function influenceAt(px, point, g) {
    const track = influenceTrack(g), distance = point === 1 ? px - g.left : g.right - px;
    return clamp3((distance - track.start) / (track.end - track.start), 0, 1);
  }
  function fromSpeed(c, point, influence, speed) {
    const d = clamp3(influence, 1e-4, 1), s = Number.isFinite(speed) ? speed : 0, next = { ...c };
    if (point === 1) {
      next.x1 = d;
      next.y1 = clamp3(s * d, -4, 4);
    } else {
      next.x2 = 1 - d;
      next.y2 = clamp3(1 - s * d, -4, 4);
    }
    return next;
  }

  // client/reference/src/lab/registry-graph.js
  var esc3 = (value2) => String(value2).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  var tick = (n) => !Number.isFinite(n) ? n > 0 ? "∞" : "−∞" : Math.abs(n) >= 1e3 ? n.toExponential(0) : Number(n.toPrecision(3)).toString();
  var coordinate = (n) => String(Number(n.toFixed(4)));
  var node = (key, tag, attrs = {}, children = [], text2 = null) => ({ key, tag, attrs, children, text: text2 });
  var text = (key, x, y, value2, attrs = {}) => node(key, "text", { x, y, ...attrs }, [], value2);
  var path = (key, cls, d, attrs = {}) => node(key, "path", { class: cls, d, ...attrs });
  var caches = /* @__PURE__ */ new WeakMap();
  function curveDrawing(c, { key, title, mode, overlay: overlay2, editable, size, ranges }) {
    const p = curveGeometry(c, "progress", size, ranges?.progress);
    const v = mode === "speed" || overlay2 ? curveGeometry(c, "speed", size, ranges?.speed) : null, g = mode === "speed" ? v : p;
    const valueVisible = mode === "progress" || overlay2, speedVisible = !!v;
    const focusAttrs = (point, kind, label2, active) => ({ tabindex: editable && active ? "0" : null, role: editable && active ? "button" : null, "data-reg-handle": editable && active ? key : null, "data-point": point, "data-handle-kind": kind, "aria-label": editable && active ? label2 : null });
    const handle = (id, point, x, y, kind, label2, active) => node(id, "g", { class: "reg-handle-group", ...focusAttrs(point, kind, label2 + copy("; arrow keys adjust, Shift for larger steps"), active) }, [
      node(id + "-title", "title", {}, [], label2),
      node(id + "-hit", "circle", { class: "reg-handle-hit", cx: x, cy: y, r: 9 }),
      node(id + "-dot", "circle", { class: "reg-handle", cx: x, cy: y, r: 3 })
    ]);
    const nodes = [
      path("grid", "reg-graph-grid", `M${g.left} ${g.top}V${g.bottom}H${g.right} M${g.left} ${g.y(0)}H${g.right} M${g.left} ${g.y(1)}H${g.right}`),
      node("value-axis", "g", { class: "reg-value-axis", hidden: !valueVisible }, [text("value-one", g.left - 8, p.y(1) + 4, "1", { "text-anchor": "end" }), text("value-zero", g.left - 8, p.y(0) + 4, "0", { "text-anchor": "end" })]),
      node("speed-axis", "g", { class: "reg-speed-axis", hidden: !speedVisible }, [
        text("speed-high", g.right + 8, v ? v.y(v.hi) + 4 : 0, v ? tick(v.hi) : ""),
        text("speed-zero", g.right + 8, v ? v.y(0) + 4 : 0, "0"),
        text("speed-low", g.right + 8, v ? v.y(v.lo) + 4 : 0, v ? tick(v.lo) : "", { hidden: !v || v.lo >= 0 })
      ]),
      text("time-zero", g.left, g.height - 7, "0", { class: "reg-time-label" }),
      text("time-one", g.right, g.height - 7, "1", { class: "reg-time-label", "text-anchor": "end" }),
      path("value-line", "reg-graph-line", p.path, { "data-reg-series": "progress", hidden: !valueVisible }),
      path("speed-line", "reg-graph-line", v?.path || "", { "data-reg-series": "speed", hidden: !speedVisible }),
      node("value-handles", "g", { hidden: mode !== "progress" }, [
        path("value-tangent", "reg-graph-handle", `M${p.x(0)},${p.y(0)} L${p.x(c.x1)},${p.y(c.y1)} M${p.x(1)},${p.y(1)} L${p.x(c.x2)},${p.y(c.y2)}`),
        ...[1, 2].map((n) => handle("value-" + n, n, p.x(c["x" + n]), p.y(c["y" + n]), "value", copy("Control point {index}: X {x}, Y {y}", { index: n, x: coordinate(c["x" + n]), y: coordinate(c["y" + n]) }), mode === "progress"))
      ]),
      node("speed-handles", "g", { hidden: mode !== "speed" }, [1, 2].flatMap((n) => {
        const h = v ? speedHandle(c, n, v) : { x: 0, y: 0, anchorX: 0, anchorY: 0, speed: 0, influence: 0 }, direction = copy(n === 1 ? "Outgoing" : "Incoming");
        return [
          path("speed-tangent-" + n, "reg-graph-handle reg-speed-tangent", `M${h.anchorX},${h.anchorY}H${h.x}`),
          node("speed-keyframe-" + n, "g", { class: "reg-speed-keyframe", ...focusAttrs(n, "speed-value", copy("{kind} speed {speed}; up and down arrows adjust speed", { kind: direction, speed: tick(h.speed) }), mode === "speed") }, [
            node("speed-keyframe-hit-" + n, "circle", { class: "reg-handle-hit", cx: h.anchorX, cy: h.anchorY, r: 7 }),
            path("speed-diamond-" + n, "reg-keyframe", `M${h.anchorX},${h.anchorY - 3}l3 3-3 3-3-3Z`)
          ]),
          handle("speed-" + n, n, h.x, h.y, "speed", copy("{kind}: speed {speed}, influence {influence}%", { kind: direction, speed: tick(h.speed), influence: Math.round(h.influence * 1e4) / 100 }), mode === "speed"),
          text("speed-infinity-" + n, h.x, h.y + (h.speed > 0 ? 12 : -7), tick(h.speed), { hidden: Number.isFinite(h.speed) })
        ];
      }))
    ];
    return { nodes, width: g.width, height: g.height, mode, overlay: overlay2, label: `${title}; ${copy(mode === "progress" ? "value focused" : "speed focused")}${overlay2 ? copy(", value and speed overlay") : ""}` };
  }
  function attributes(attrs) {
    return Object.entries(attrs).filter(([, v]) => v !== null && v !== false).map(([k, v]) => ` ${k}="${v === true ? "" : esc3(v)}"`).join("");
  }
  function curveGraphHTML(drawing) {
    const serialize = (n) => `<${n.tag} data-graph-node="${n.key}"${attributes(n.attrs)}>${n.text === null ? n.children.map(serialize).join("") : esc3(n.text)}</${n.tag}>`;
    return drawing.nodes.map(serialize).join("");
  }
  function updateCurveGraph(svg, drawing) {
    let nodes = caches.get(svg);
    if (!nodes) {
      nodes = new Map([...svg.querySelectorAll("[data-graph-node]")].map((el) => [el.getAttribute("data-graph-node"), el]));
      caches.set(svg, nodes);
    }
    const update = (n) => {
      const el = nodes.get(n.key);
      for (const [key, value2] of Object.entries(n.attrs)) {
        if (value2 === null || value2 === false) {
          if (el.hasAttribute(key)) el.removeAttribute(key);
        } else {
          const next = value2 === true ? "" : String(value2);
          if (el.getAttribute(key) !== next) el.setAttribute(key, next);
        }
      }
      if (n.text !== null && el.textContent !== String(n.text)) el.textContent = n.text;
      n.children.forEach(update);
    };
    drawing.nodes.forEach(update);
    const active = nodes.get(drawing.mode === "speed" ? "speed-line" : "value-line"), other = nodes.get(drawing.mode === "speed" ? "value-line" : "speed-line");
    if (other.nextElementSibling !== active) svg.insertBefore(active, other.nextElementSibling);
    svg.setAttribute("viewBox", `0 0 ${drawing.width} ${drawing.height}`);
    svg.style.height = drawing.height + "px";
    svg.setAttribute("aria-label", drawing.label);
  }

  // client/reference/src/lab/registry-focus.js
  function captureRegistryFocus(root2) {
    const active = document.activeElement, el = active?.hasAttribute("data-reference-select") ? active.closest(".custom-select").previousElementSibling : active;
    if (!el || !root2.contains(el)) return null;
    const attrs = [...el.attributes].filter((a) => a.name.startsWith("data-reg-") || ["data-axis", "data-point", "data-handle-kind", "data-value", "data-tool-use", "type"].includes(a.name)).map((a) => [a.name, a.value]);
    return { tag: el.tagName, attrs, id: el.id, section: el.closest("[data-reg-section]")?.dataset.regSection, selection: el.tagName === "TEXTAREA" || ["text", "search"].includes(el.type) ? [el.selectionStart, el.selectionEnd] : null };
  }
  function restoreRegistryFocus(root2, saved) {
    if (!saved) return;
    const usable = (el) => el && !el.disabled && !el.closest("[hidden]");
    let target = [...root2.querySelectorAll(saved.tag)].find((el) => saved.attrs.length ? saved.attrs.every(([key, value2]) => el.getAttribute(key) === value2) : saved.id && el.id === saved.id);
    if (target?.disabled) target = root2.querySelector("[data-reg-status]");
    if (!usable(target)) target = [...root2.querySelectorAll("[data-reg-collapse]")].find((el) => el.dataset.regCollapse === saved.section);
    if (!usable(target)) target = root2.querySelector("[data-reg-status]");
    (target?._coreSelectComponent?.trigger || target)?.focus({ preventScroll: true });
    if (saved.selection && target?.setSelectionRange && ["text", "search", "textarea"].includes(target.type)) target.setSelectionRange(...saved.selection);
  }

  // client/reference/src/lab/registry-view.js
  var esc4 = (value2) => String(value2 ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  var sessions = /* @__PURE__ */ new Map();
  var instance = 0;
  var RegistryView = class {
    constructor(root2, id, { saved, sessionKey = id } = {}) {
      this.root = root2;
      this.root.dataset.registryTool = id;
      this.id = id;
      this.sessionKey = sessionKey;
      const cached = saved || sessions.get(sessionKey);
      this.session = new RegistrySession(id, cached?.session);
      this.schema = REGISTRY_SCHEMAS[id];
      this.ui = { lang: "en", query: "", collapsed: {}, curveModes: {}, curveOverlays: {}, curveHeights: {}, previewOpen: id === "selection" || (root2.closest(".plugin")?.clientWidth || 0) >= 800, ...clone(cached?.ui || {}) };
      this.uid = "registry-" + ++instance;
      this.graphSizes = {};
      this.graphObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver((entries) => {
        for (const entry of entries) {
          const key = entry.target.closest("[data-reg-curve]")?.dataset.regCurve;
          if (!key || !this.root.contains(entry.target) || !entry.contentRect.width) continue;
          const width = entry.target.clientWidth, height = entry.target.clientHeight, previous = this.graphSizes[key];
          if (previous && Math.abs(previous.width - width) < 0.1 && Math.abs(previous.height - height) < 0.1) continue;
          this.graphSizes[key] = { width, height };
          if (this.drag?.key === key) this.drag.rect = null;
          this.repaintCurve(key);
        }
      });
      this.closingPickers = /* @__PURE__ */ new Set();
      this.abort = new AbortController();
      this.busy = false;
      this.feedback = cached?.feedback || copy("Interactive preview · After Effects is not connected");
      const options = { signal: this.abort.signal };
      root2.addEventListener("click", (e) => this.click(e), options);
      root2.addEventListener("input", (e) => this.input(e), options);
      root2.addEventListener("change", (e) => this.change(e), options);
      root2.addEventListener("focusout", (e) => {
        if (e.target.dataset.regCurveValue) this.commitCurveInput(e.target);
      }, options);
      root2.addEventListener("scroll", () => {
        if (this.drag) this.drag.rect = null;
      }, { ...options, capture: true });
      root2.addEventListener("pointerdown", (e) => this.pointerDown(e), options);
      root2.addEventListener("pointermove", (e) => this.pointerMove(e), options);
      root2.addEventListener("pointerup", (e) => this.endDrag(e), options);
      root2.addEventListener("pointercancel", (e) => this.endDrag(e, true), options);
      root2.addEventListener("lostpointercapture", (e) => this.endDrag(e), options);
      root2.addEventListener("keydown", (e) => this.keydown(e), options);
      this.render();
      if (cached?.scroll) this.root.querySelector(".reg-body").scrollTop = cached.scroll;
      if (cached?.formScroll) this.root.querySelector(".reg-form").scrollTop = cached.formScroll;
    }
    t(key) {
      return label(this.schema, key, this.ui.lang);
    }
    attr(field2) {
      return `${!this.session.enabled(field2) || this.busy ? " disabled" : ""}${field2.readonly ? " readonly" : ""}`;
    }
    actionHTML(field2, key) {
      const variant2 = field2.variant || field2.style || "secondary";
      return `<button type="button" class="reg-action reg-${esc4(variant2)}" data-reg-action="${esc4(key)}" ${!this.session.enabled(field2) || this.busy ? "disabled" : ""}><span>${esc4(this.t(field2.labelKey))}</span>${field2.secondaryText ? `<small>${esc4(field2.secondaryText)}</small>` : ""}</button>`;
    }
    fieldHTML(field2, index) {
      const key = field2.key, id = `${this.uid}-${key || index}`, title = this.t(field2.labelKey), value2 = this.session.values[key], hint = this.t(field2.hintKey), a = this.attr(field2), labelHTML = `<label class="reg-label" for="${id}">${esc4(title)}</label>`, help = hint ? `<span class="reg-hint">${esc4(hint)}</span>` : "";
      let control = "";
      switch (field2.type) {
        case "divider":
        case "separator":
          return '<hr class="reg-divider">';
        case "subheading":
          return `<h5 class="reg-subheading">${esc4(title)}</h5>`;
        case "info":
        case "note":
          return `<p class="reg-note">${esc4(title)}</p>`;
        case "button":
        case "actionButton":
          return this.actionHTML(field2, key);
        case "text":
          control = `${labelHTML}<input id="${id}" data-reg-value="${key}" value="${esc4(value2)}"${a}>`;
          break;
        case "textarea":
          control = `${labelHTML}<textarea id="${id}" data-reg-value="${key}" rows="3"${a}>${esc4(value2)}</textarea>`;
          break;
        case "number":
        case "range": {
          const bounds = `${field2.min !== void 0 ? `min="${field2.min}"` : ""} ${field2.max !== void 0 ? `max="${field2.max}"` : ""} step="${field2.step || 1}"`;
          const number = `<input type="number" id="${id}" data-reg-value="${key}" value="${value2}" ${bounds}${a}>`;
          control = labelHTML + (field2.type === "range" ? rangeNumber(number, `<input type="range" aria-label="${esc4(title)} ${copy("slider")}" data-reg-value="${key}" value="${value2}" ${bounds}${a}>`) : `<div class="reg-numeric">${number}</div>`);
          break;
        }
        case "switch":
        case "checkbox":
          control = `<label class="reg-check"><span>${esc4(title)}</span><input id="${id}" type="checkbox" ${field2.type === "switch" ? 'role="switch"' : ""} data-reg-value="${key}" ${value2 ? "checked" : ""}${a}></label>`;
          break;
        case "select":
          control = `${labelHTML}<select id="${id}" data-reg-value="${key}"${a}>${field2.options.map((o) => `<option value="${esc4(o.value)}" ${o.value === value2 ? "selected" : ""} ${o.disabled ? "disabled" : ""}>${esc4(this.t(o.labelKey))}</option>`).join("")}</select>`;
          break;
        case "tabs":
          control = `<span class="reg-label">${esc4(title)}</span><div class="reg-options" role="group" aria-label="${esc4(title)}">${field2.options.map((o) => `<button type="button" data-reg-tab="${key}" data-value="${esc4(o.value)}" aria-pressed="${o.value === value2}" ${o.disabled || !this.session.enabled(field2) || this.busy ? "disabled" : ""} title="${esc4(this.t(o.descriptionKey))}">${o.iconText ? `<i aria-hidden="true">${esc4(o.iconText)}</i>` : ""}<span>${esc4(this.t(o.labelKey))}</span></button>`).join("")}</div>`;
          break;
        case "color":
          control = labelHTML + colorControl(`<input id="${id}" data-reg-value="${key}" value="${esc4(value2)}" spellcheck="false" maxlength="7" aria-label="${esc4(title)} HEX"${a}>`, `<button type="button" data-reg-color="${key}" aria-label="${esc4(copy("Edit {title}", { title }))}" aria-haspopup="dialog" aria-expanded="false"${a}><i style="background:${esc4(value2)}"></i></button>`);
          break;
        case "cubicBezier":
          control = `<span class="reg-label">${esc4(title)}${field2.readonly ? `<small>${copy("Read only")}</small>` : field2.disabled ? `<small>${copy("Disabled")}</small>` : ""}</span><div data-reg-curve="${key}">${this.curveHTML(field2)}</div>`;
          break;
        default:
          throw new Error("Unsupported Registry control: " + field2.type);
      }
      return `<div class="reg-field reg-type-${field2.type}" data-reg-field="${esc4(key || index)}">${control}${help}</div>`;
    }
    curveSize(key) {
      return { width: this.graphSizes[key]?.width || this.root.querySelector(`[data-reg-curve="${key}"] .reg-graph-viewport`)?.clientWidth || 300, height: clamp3(this.ui.curveHeights[key] || CURVE_HEIGHT.default, CURVE_HEIGHT.min, CURVE_HEIGHT.max) };
    }
    drawing(field2) {
      const key = field2.key;
      return curveDrawing(this.session.values[key], { key, title: this.t(field2.labelKey), mode: this.ui.curveModes[key] || field2.initialView || "progress", overlay: this.ui.curveOverlays[key] !== false, editable: !field2.readonly && this.session.enabled(field2) && !this.busy, size: this.curveSize(key), ranges: this.drag?.key === key ? this.drag.ranges : null });
    }
    curveHTML(field2) {
      const key = field2.key, c = this.session.values[key], d = this.drawing(field2), editable = !field2.readonly && this.session.enabled(field2) && !this.busy;
      return `<div class="reg-curve-toolbar" role="group" aria-label="${copy("Curve view")}">${["progress", "speed"].map((m) => `<button type="button" data-reg-curve-mode="${key}" data-reg-mode="${m}" aria-pressed="${d.mode === m}" ${field2.disabled ? "disabled" : ""}>${m === "progress" ? copy("Value") : copy("Speed")}</button>`).join("")}<button type="button" class="reg-overlay-button" data-reg-overlay="${key}" aria-pressed="${d.overlay}" aria-label="${copy("Overlay value and speed curves")}" ${field2.disabled ? "disabled" : ""}>${copy("Overlay")}</button></div><div class="reg-graph-stage" data-focus="${d.mode}" data-overlay="${d.overlay}"><div class="reg-axis-labels"><span>${copy("Value")}</span><span>${copy("Speed · Δvalue / Δtime")}</span></div><div class="reg-graph-viewport"><svg id="${this.uid}-${key}-graph" class="reg-curve-graph" viewBox="0 0 ${d.width} ${d.height}" style="height:${d.height}px" role="group" aria-label="${esc4(d.label)}">${curveGraphHTML(d)}</svg></div><div class="reg-curve-resize" tabindex="0" role="separator" aria-orientation="horizontal" aria-label="${copy("Resize curve height")}" aria-controls="${this.uid}-${key}-graph" aria-valuemin="${CURVE_HEIGHT.min}" aria-valuemax="${CURVE_HEIGHT.max}" aria-valuenow="${d.height}" data-reg-curve-resize="${key}" title="${copy("Drag to resize · Up / Down to adjust")}"><span></span></div></div><div class="reg-curve-values">${["x1", "y1", "x2", "y2"].map((k) => `<label>${k.toUpperCase()}<input type="number" data-reg-curve-value="${key}" data-axis="${k}" value="${c[k]}" min="${k[0] === "x" ? 0 : -4}" max="${k[0] === "x" ? 1 : 4}" step="0.01" aria-describedby="${this.uid}-${key}-notice" ${!editable ? "disabled" : ""}></label>`).join("")}</div><p class="reg-curve-notice" id="${this.uid}-${key}-notice" data-reg-curve-notice="${key}" role="status" aria-live="polite"></p><p class="reg-curve-gesture">${d.mode === "speed" ? copy("↔ Influence · ↕ Speed") : copy("Drag handles to shape the curve")}</p>`;
    }
    observeGraphs() {
      this.graphObserver?.disconnect();
      this.root.querySelectorAll(".reg-graph-viewport").forEach((viewport) => this.graphObserver?.observe(viewport));
    }
    refreshSections() {
      this.endDrag(null, true);
      const saved = captureRegistryFocus(this.root);
      this.root.querySelector(".reg-sections").innerHTML = this.sectionsHTML();
      this.observeGraphs();
      mountControls(this.root);
      if (saved && !document.activeElement?.isConnected) restoreRegistryFocus(this.root, saved);
    }
    sectionsHTML() {
      const query = this.ui.query.toLocaleLowerCase().trim();
      let count = 0;
      const html = (this.schema.sections || []).map((section) => {
        const allMatch = this.t(section.labelKey).toLocaleLowerCase().includes(query), fields2 = section.fields.filter((f) => this.session.visible(f) && (!query || allMatch || (this.t(f.labelKey) + " " + (f.key || "") + " " + (f.secondaryText || "")).toLocaleLowerCase().includes(query)));
        if (!fields2.length) return "";
        count += fields2.length;
        const collapsed = !query && (this.ui.collapsed[section.id] ?? !!section.defaultCollapsed), contentID = `${this.uid}-section-${section.id}`;
        return `<section class="reg-section" data-reg-section="${section.id}"><header class="reg-section-head"><button type="button" class="reg-section-title" data-reg-collapse="${section.id}" aria-expanded="${!collapsed}" aria-controls="${contentID}"><svg class="disclosure-icon" viewBox="0 0 16 16" aria-hidden="true"><path d="m6 4 4 4-4 4"/></svg><h4>${esc4(this.t(section.labelKey))}</h4></button>${section.toggleKey ? `<label class="reg-section-toggle"><span class="sr-only">${esc4(copy("Enable {title}", { title: this.t(section.labelKey) }))}</span><input type="checkbox" role="switch" data-reg-toggle="${section.toggleKey}" ${this.session.values[section.toggleKey] ? "checked" : ""} ${this.busy ? "disabled" : ""}></label>` : ""}</header><div id="${contentID}" class="reg-section-content" ${collapsed ? "hidden" : ""}>${section.descriptionKey ? `<p class="reg-description">${esc4(this.t(section.descriptionKey))}</p>` : ""}<div class="reg-fields ${section.id === "nativeItems" ? "reg-native-items" : ""}">${fields2.map((f, i) => this.fieldHTML(f, section.id + "-" + i)).join("")}</div></div></section>`;
      }).join("");
      return count ? html : query ? `<p class="reg-empty">${copy("No matching controls. Try another search.")}</p>` : "";
    }
    render() {
      this.endDrag(null, true);
      const saved = captureRegistryFocus(this.root), scroll = this.root.querySelector(".reg-body")?.scrollTop || 0, formScroll = this.root.querySelector(".reg-form")?.scrollTop || 0;
      this.root.dataset.previewOpen = String(this.ui.previewOpen);
      this.closePicker(false);
      disposeControls(this.root);
      this.root.innerHTML = `<div class="reg-toolbar"><span class="reg-preview-badge">${copy("Preview")}</span><label><span class="sr-only">${copy("Preview selection")}</span><select data-reg-context ${this.busy ? "disabled" : ""}>${CONTEXTS.map(([key, name2]) => `<option value="${key}" ${this.session.context === key ? "selected" : ""}>${esc4(copy(name2))}</option>`).join("")}</select></label><label><span class="sr-only">${copy("Tool language")}</span><select data-reg-language><option value="en" ${this.ui.lang === "en" ? "selected" : ""}>EN</option><option value="zh-CN" ${this.ui.lang === "zh-CN" ? "selected" : ""}>中文</option></select></label></div><div class="reg-body"><aside class="reg-inspector"><button class="reg-preview-toggle" type="button" data-reg-preview aria-expanded="${this.ui.previewOpen}"><span>${copy("Preview & context")}</span><svg class="disclosure-icon" viewBox="0 0 16 16" aria-hidden="true"><path d="m6 4 4 4-4 4"/></svg></button><div class="reg-preview-content" ${this.ui.previewOpen ? "" : "hidden"}><div class="reg-live-preview"></div><div class="reg-context"></div><p class="reg-preview-note">${copy("Local illustration · No changes to After Effects")}</p></div></aside><div class="reg-form">${this.id !== "selection" ? `<div class="reg-search"><label><span class="sr-only">${copy("Find a control")}</span><input type="search" data-reg-search placeholder="${copy("Find a control…")}" value="${esc4(this.ui.query)}"></label>${!this.schema.hideRestoreDefaults ? `<button type="button" data-reg-reset title="${copy("Restore this tool’s controls")}" ` + (this.busy ? "disabled" : "") + `>${copy("Reset")}</button>` : ""}</div>` : ""}<div class="reg-sections">${this.sectionsHTML()}</div><details class="reg-result" ${this.session.lastResult ? "" : "hidden"}><summary data-reg-result>${copy("Preview result")}</summary><pre></pre></details></div></div><footer class="reg-footer"><span class="reg-feedback" data-reg-status tabindex="-1" role="status" aria-live="polite"></span><div class="reg-footer-actions">${this.schema.actions.filter((a) => !a.hidden && !a.fieldOnly).map((a) => this.actionHTML(a, a.id)).join("")}<button type="button" class="reg-action" data-tool-use>${copy("Use in Vela")}</button></div></footer>`;
      this.root.querySelector(".reg-body").scrollTop = scroll;
      this.root.querySelector(".reg-form").scrollTop = formScroll;
      this.paint();
      this.observeGraphs();
      mountControls(this.root);
      restoreRegistryFocus(this.root, saved);
    }
    paint() {
      this.root.querySelector(".reg-feedback").textContent = copy(this.feedback);
      this.root.querySelector(".reg-feedback").dataset.tone = this.session.lastResult?.ok === false ? "error" : "normal";
      const state = this.session.state, fields2 = this.schema.stateCard?.fields || [{ stateKey: "activeComp", label: copy("Composition") }, { stateKey: "selectionCount", label: copy("Selected layers") }];
      this.root.querySelector(".reg-context").innerHTML = `<dl>${fields2.map((f) => `<div><dt>${esc4(f.label || this.t(f.labelKey))}</dt><dd>${typeof state[f.stateKey] === "boolean" ? state[f.stateKey] ? copy("Ready") : copy("Unavailable") : esc4(state[f.stateKey])}</dd></div>`).join("")}</dl>`;
      this.root.querySelector(".reg-live-preview").innerHTML = this.previewHTML();
      const result = this.root.querySelector(".reg-result");
      result.hidden = !this.session.lastResult;
      if (this.session.lastResult) result.querySelector("pre").textContent = JSON.stringify(this.session.lastResult, null, 2);
    }
    previewHTML() {
      const v = this.session.values, s = this.session.state;
      if (!s.hasComp) return `<div class="reg-illustration reg-preview-empty">${copy("Open a composition")}<br><small>${copy("Choose a preview context above")}</small></div>`;
      if (this.id === "text") {
        const fill = v.enableFill ? v.fillMode === "Gradient Fill" ? `linear-gradient(110deg,${v.fillColor},#797184)` : v.fillColor : "transparent";
        return `<div class="reg-illustration"><span class="reg-background-sample" style="padding:${Math.min(v.paddingY, 70) / 3 + 3}px ${Math.min(v.paddingX, 100) / 3 + 3}px;border-radius:${Math.min(v.cornerRadius, 120) / 3}px"><i style="background:${esc4(fill)};opacity:${v.fillOpacity / 100}"></i><i style="border:${v.enableStroke ? Math.min(v.strokeWidth, 30) / 2 : 0}px solid ${esc4(v.strokeColor)};opacity:${v.strokeOpacity / 100};${v.strokeMode === "Gradient Stroke" ? "mask-image:linear-gradient(90deg,#000,transparent)" : ""}"></i><strong>${s.selectionCount ? "Opening titles" : "100 × 100"}</strong></span></div>`;
      }
      if (this.id === "kit") {
        if (v.componentKind === "featureStack") return `<div class="reg-illustration"><div class="reg-stack" style="gap:${Math.min(v.gap, 100) / 4}px;align-items:${v.textAlign === "left" ? "flex-start" : "center"}">${[copy("Build with intention"), copy("Make it move"), copy("Made in Lomond")].map((text2) => `<span style="background:${v.fillColor};border-radius:${v.cornerRadius / 3}px;padding:${v.paddingY / 4 + 3}px ${v.paddingX / 4 + 5}px;${v.pillWidthMode === "fixed" ? "width:" + Math.min(100, v.fixedWidth / 4) + "%;" : ""}">${text2}</span>`).join("")}</div></div>`;
        return `<div class="reg-illustration"><div class="reg-icon-grid" style="grid-template-columns:repeat(${v.columns},minmax(0,1fr));gap:${Math.min(v.gapY / 6, 20)}px ${Math.min(v.gapX / 6, 20)}px">${Array.from({ length: 6 }, (_, i) => `<span style="aspect-ratio:${v.cellWidth}/${v.cellHeight};font-size:${Math.min(22, Math.max(8, v.targetHeight / 4))}px">${["◆", "●", "✦", "■", "○", "◇"][i]}</span>`).join("")}</div></div>`;
      }
      if (this.id === "shape") return `<div class="reg-illustration"><svg viewBox="0 0 200 110" aria-label="${copy("Shape illustration")}"><path d="M35 55 C35 6 165 6 165 55 S35 104 35 55Z" fill="${v.fillColor}" stroke="${v.strokeColor}" stroke-width="${Math.min(16, v.strokeWidth / 2)}" stroke-dasharray="${Math.max(0, v.trimEnd - v.trimStart) * 3.9} 390" stroke-dashoffset="${v.trimOffset}"/></svg></div><p class="reg-items-count">${this.session.items.length} preview operations</p>${this.session.items.length ? `<ol class="reg-operation-list">${this.session.items.slice(-5).map((item) => `<li>${esc4(item.key)}</li>`).join("")}</ol>` : ""}`;
      if (this.id === "selection") return `<div class="reg-selection"><strong>${s.selectionCount}</strong><span>selected layers</span></div>${s.selectionCount ? `<ul class="reg-layer-list">${Array.from({ length: s.selectionCount }, (_, i) => `<li><i>${this.session.context === "shapes" ? "◇" : "T"}</i><span>${this.session.context === "shapes" ? "Shape " + (i + 1) : ["Title", "Subtitle", "Caption"][i]}<small>${this.session.context === "shapes" ? "Shape" : "Text"} layer · 2D</small></span></li>`).join("")}</ul>` : `<p class="reg-note">${copy("Choose a selection context above.")}</p>`}`;
      return '<div class="reg-control-mark" aria-hidden="true"><span>01</span><i></i><i></i><b>Registry</b></div>';
    }
    syncFields(key, source) {
      for (const input of this.root.querySelectorAll(`[data-reg-value="${key}"]`)) if (input !== source) {
        if (input.type === "checkbox") input.checked = !!this.session.values[key];
        else input.value = this.session.values[key];
      }
      if (this.session.field(key)?.type === "color") {
        const chip = this.root.querySelector(`[data-reg-color="${key}"] i`);
        if (chip) chip.style.background = this.session.values[key];
      }
    }
    input(e) {
      const el = e.target;
      if (el.matches("[data-reg-search]")) {
        this.ui.query = el.value;
        this.refreshSections();
        return;
      }
      if (el.dataset.regCurveValue) {
        this.editCurve(el.dataset.regCurveValue, el.dataset.axis, el.value, el);
        return;
      }
      const key = el.dataset.regValue;
      if (!key) return;
      const value2 = el.type === "checkbox" ? el.checked : el.value, valid = this.session.set(key, value2);
      el.setAttribute("aria-invalid", String(!valid));
      if (valid) {
        this.syncFields(key, el);
        this.paint();
      }
    }
    change(e) {
      const el = e.target;
      if (el.dataset.regCurveValue) {
        this.commitCurveInput(el);
        return;
      }
      if (el.hasAttribute("data-reg-context")) {
        this.session.setContext(el.value);
        this.feedback = copy("Preview context changed");
        this.render();
        return;
      }
      if (el.hasAttribute("data-reg-language")) {
        this.ui.lang = el.value;
        this.render();
        return;
      }
      if (el.dataset.regToggle) {
        if (!this.busy) {
          this.session.values[el.dataset.regToggle] = el.checked;
          const section = this.schema.sections.find((s) => s.toggleKey === el.dataset.regToggle);
          this.ui.collapsed[section.id] = !el.checked;
          this.updateSection(section.id);
        }
        return;
      }
      if (el.dataset.regValue) {
        this.input(e);
        if (el.getAttribute("aria-invalid") === "true") {
          el.value = this.session.values[el.dataset.regValue];
          el.removeAttribute("aria-invalid");
        }
        if (["select", "tabs", "switch", "checkbox"].includes(this.session.field(el.dataset.regValue)?.type)) this.render();
        else this.syncFields(el.dataset.regValue);
      }
    }
    click(e) {
      const b = e.target.closest("button");
      if (!b || b.disabled) return;
      if (b.dataset.regCollapse) {
        const id = b.dataset.regCollapse, section = this.schema.sections.find((s) => s.id === id);
        this.ui.collapsed[id] = !(this.ui.collapsed[id] ?? !!section.defaultCollapsed);
        this.updateSection(id);
      }
      if (b.hasAttribute("data-reg-preview")) {
        this.ui.previewOpen = !this.ui.previewOpen;
        this.render();
        this.root.querySelector("[data-reg-preview]").focus({ preventScroll: true });
      }
      if (b.dataset.regTab) {
        this.session.set(b.dataset.regTab, b.dataset.value);
        this.render();
        this.root.querySelector(`[data-reg-tab="${b.dataset.regTab}"][data-value="${b.dataset.value}"]`)?.focus({ preventScroll: true });
      }
      if (b.dataset.regCurveMode) {
        this.ui.curveModes[b.dataset.regCurveMode] = b.dataset.regMode;
        this.repaintCurve(b.dataset.regCurveMode, b);
        e.stopPropagation();
      }
      if (b.dataset.regOverlay) {
        const key = b.dataset.regOverlay;
        this.ui.curveOverlays[key] = this.ui.curveOverlays[key] === false;
        this.repaintCurve(key, b);
        e.stopPropagation();
      }
      if (b.dataset.regColor) this.openPicker(b.dataset.regColor);
      if (b.hasAttribute("data-reg-reset")) {
        this.session.values = defaults(this.schema);
        this.feedback = copy("Controls restored to source defaults");
        this.render();
        this.root.querySelector("[data-reg-reset]")?.focus({ preventScroll: true });
      }
      if (b.dataset.regAction) this.run(b.dataset.regAction);
    }
    async run(key) {
      if (this.busy) return;
      const field2 = this.session.action(key);
      if (!field2 || !this.session.enabled(field2) || !this.session.visible(field2)) return;
      const action = this.schema.actions.find((a) => a.id === (field2.actionId || field2.id));
      this.busy = true;
      this.feedback = copy("Preview") + " · " + (this.t(field2.pendingMessageKey || action?.pendingMessageKey) || copy("Running…"));
      this.render();
      await new Promise((resolve) => {
        this.finishPending = resolve;
        this.pendingTimer = setTimeout(resolve, 360);
      });
      this.finishPending = null;
      if (this.abort.signal.aborted) return;
      const result = this.session.run(key);
      this.busy = false;
      this.feedback = result?.ok ? copy("Preview") + " · " + (this.t(field2.successMessageKey || action?.successMessageKey) || copy("Complete. Inspect the result below.")) : copy("Preview") + " · " + (this.t(field2.errorMessageKey || action?.errorMessageKey) || copy("Action failed. Check the context and try again."));
      const restoreAction = this.root.contains(document.activeElement) && document.activeElement?.hasAttribute("data-reg-status");
      this.render();
      if (restoreAction) this.root.querySelector(`[data-reg-action="${key}"]`)?.focus({ preventScroll: true });
    }
    updateSection(id) {
      const section = this.schema.sections.find((s) => s.id === id), host = this.root.querySelector(`[data-reg-section="${id}"]`);
      if (!host) return;
      const collapsed = this.ui.collapsed[id] ?? !!section.defaultCollapsed;
      host.querySelector("[data-reg-collapse]").setAttribute("aria-expanded", String(!collapsed));
      host.querySelector(".reg-section-content").hidden = collapsed;
      for (const field2 of section.fields) {
        if (!field2.key) continue;
        const row = host.querySelector(`[data-reg-field="${field2.key}"]`), button2 = host.querySelector(`[data-reg-action="${field2.key}"]`);
        if (button2) button2.disabled = !this.session.enabled(field2) || this.busy;
        if (row) for (const control of row.querySelectorAll("input,select,textarea,button")) control.disabled = !this.session.enabled(field2) || !!field2.readonly || this.busy;
        if (field2.type === "cubicBezier") this.repaintCurve(field2.key);
      }
      if (this.picker && section.fields.some((f) => f.key === this.pickerKey) && !this.session.values[section.toggleKey]) this.closePicker(false);
      this.paint();
      mountControls(this.root);
    }
    repaintCurve(key, source) {
      const field2 = this.session.field(key), host = this.root.querySelector(`[data-reg-curve="${key}"]`);
      if (!host) return;
      const d = this.drawing(field2);
      updateCurveGraph(host.querySelector("svg"), d);
      host.querySelector("[data-reg-curve-resize]").setAttribute("aria-valuenow", String(d.height));
      host.querySelector(".reg-curve-gesture").textContent = d.mode === "speed" ? copy("↔ Influence · ↕ Speed") : copy("Drag handles to shape the curve");
      const stage = host.querySelector(".reg-graph-stage");
      stage.dataset.focus = d.mode;
      stage.dataset.overlay = String(d.overlay);
      for (const button2 of host.querySelectorAll("[data-reg-mode]")) button2.setAttribute("aria-pressed", String(button2.dataset.regMode === d.mode));
      host.querySelector("[data-reg-overlay]").setAttribute("aria-pressed", String(d.overlay));
      for (const input of host.querySelectorAll("[data-axis]")) if (input !== source && input !== document.activeElement) {
        input.value = this.session.values[key][input.dataset.axis];
        input.removeAttribute("aria-invalid");
      }
    }
    curveNotice(key, message) {
      const notice = this.root.querySelector(`[data-reg-curve-notice="${key}"]`);
      if (notice) notice.textContent = message;
    }
    editCurve(key, axis, value2, source) {
      const n = Number(value2), min = axis[0] === "x" ? 0 : -4, max = axis[0] === "x" ? 1 : 4;
      if (value2 === "" || !Number.isFinite(n) || source && (n < min || n > max)) {
        source?.setAttribute("aria-invalid", "true");
        this.curveNotice(key, this.ui.lang === "zh-CN" ? `${axis.toUpperCase()} 请输入 ${min} 至 ${max} 的数值。` : `Enter ${axis.toUpperCase()} between ${min} and ${max}.`);
        return;
      }
      if (this.session.set(key, { ...this.session.values[key], [axis]: n })) {
        source?.removeAttribute("aria-invalid");
        this.curveNotice(key, "");
        this.repaintCurve(key, source);
      }
    }
    commitCurveInput(input) {
      const key = input.dataset.regCurveValue, axis = input.dataset.axis, raw = input.value;
      if (input.disabled || !this.session.enabled(this.session.field(key))) return;
      const n = Number(raw), min = axis[0] === "x" ? 0 : -4, max = axis[0] === "x" ? 1 : 4, valid = raw !== "" && Number.isFinite(n), value2 = valid ? clamp3(n, min, max) : this.session.values[key][axis];
      this.session.set(key, { ...this.session.values[key], [axis]: value2 });
      input.value = String(this.session.values[key][axis]);
      input.removeAttribute("aria-invalid");
      this.repaintCurve(key, input);
      if (!valid || n !== value2) this.curveNotice(key, this.ui.lang === "zh-CN" ? `${axis.toUpperCase()} 已${valid ? "限制为" : "恢复为"} ${input.value}。` : `${axis.toUpperCase()} ${valid ? "limited to" : "restored to"} ${input.value}.`);
    }
    setCurveHeight(key, height) {
      this.ui.curveHeights[key] = Math.round(clamp3(height, CURVE_HEIGHT.min, CURVE_HEIGHT.max));
      this.repaintCurve(key);
    }
    pointerDown(e) {
      const resize2 = e.target.closest("[data-reg-curve-resize]"), handle = e.target.closest("[data-reg-handle]");
      if (!resize2 && !handle || e.button !== 0 || this.drag) return;
      const active = document.activeElement;
      if (this.root.contains(active) && active?.dataset.regCurveValue) this.commitCurveInput(active);
      const key = resize2?.dataset.regCurveResize || handle.dataset.regHandle, svg = this.root.querySelector(`[data-reg-curve="${key}"] svg`), size = this.curveSize(key), rect = viewportRect(svg);
      if (resize2) this.drag = { kind: "resize", key, pointer: e.pointerId, startY: e.clientY, height: size.height, scaleY: rect.height ? rect.height / size.height : 1 };
      else {
        const field2 = this.session.field(key);
        if (!this.session.enabled(field2) || field2.readonly || this.busy) return;
        const c = clone(this.session.values[key]), p = curveGeometry(c, "progress", size), v = curveGeometry(c, "speed", size), point = Number(handle.dataset.point);
        this.drag = { kind: handle.dataset.handleKind, key, point, pointer: e.pointerId, curve: c, geometry: handle.dataset.handleKind === "value" ? p : v, ranges: { progress: { min: p.min, max: p.max }, speed: { min: v.min, max: v.max } }, startX: e.clientX, startY: e.clientY, rect };
      }
      this.drag.target = resize2 || handle;
      this.curveNotice(key, "");
      (resize2 || handle).focus({ preventScroll: true });
      this.root.setPointerCapture?.(e.pointerId);
      e.preventDefault();
      e.stopPropagation();
    }
    pointerMove(e) {
      if (!this.drag || e.pointerId !== this.drag.pointer) return;
      this.pendingPointer = { pointerId: e.pointerId, clientX: e.clientX, clientY: e.clientY };
      if (this.dragFrame !== void 0) return;
      this.dragFrame = requestAnimationFrame(() => {
        this.dragFrame = void 0;
        const latest = this.pendingPointer;
        this.pendingPointer = null;
        if (latest) this.applyPointer(latest);
      });
    }
    flushPointer(cancel = false) {
      if (this.dragFrame !== void 0) {
        cancelAnimationFrame(this.dragFrame);
        this.dragFrame = void 0;
      }
      const latest = this.pendingPointer;
      this.pendingPointer = null;
      if (latest && !cancel) this.applyPointer(latest);
    }
    applyPointer(e) {
      const d = this.drag;
      if (!d || e.pointerId !== d.pointer) return;
      if (d.kind === "resize") {
        this.setCurveHeight(d.key, d.height + (e.clientY - d.startY) / d.scaleY);
        return;
      }
      if (e.clientX === d.startX && e.clientY === d.startY) {
        if (d.moved) {
          this.session.values[d.key] = clone(d.curve);
          this.repaintCurve(d.key);
        }
        return;
      }
      d.moved = true;
      const { key, point, geometry: g } = d, svg = this.root.querySelector(`[data-reg-curve="${key}"] svg`), rect = d.rect || (d.rect = viewportRect(svg));
      if (!rect.width || !rect.height) return;
      const x = (e.clientX - rect.left) * g.width / rect.width, y = (e.clientY - rect.top) * g.height / rect.height;
      let next;
      if (d.kind === "value") next = { ...this.session.values[key], ["x" + point]: clamp3(g.unX(x), 0, 1), ["y" + point]: g.unY(y) };
      else {
        const original = speedHandle(d.curve, point, g), speed = Number.isFinite(original.speed) ? original.speed : g.unY(original.y), dx = (e.clientX - d.startX) * g.width / rect.width, dy = (e.clientY - d.startY) * g.height / rect.height;
        next = fromSpeed(d.curve, point, d.kind === "speed-value" ? original.influence : influenceAt(original.x + dx, point, g), speed - dy / (g.bottom - g.top) * (g.max - g.min));
      }
      if (this.session.set(key, next)) this.repaintCurve(key, this.root);
    }
    endDrag(e, cancel = false) {
      const d = this.drag;
      if (!d || e?.pointerId !== void 0 && e.pointerId !== d.pointer) return;
      this.flushPointer(cancel);
      this.drag = null;
      if (this.root.hasPointerCapture?.(d.pointer)) this.root.releasePointerCapture(d.pointer);
      if (cancel) {
        if (d.kind === "resize") this.ui.curveHeights[d.key] = d.height;
        else this.session.values[d.key] = d.curve;
      }
      this.repaintCurve(d.key);
      if (document.activeElement === d.target) this.root.querySelector(d.kind === "resize" ? `[data-reg-curve-resize="${d.key}"]` : `[data-reg-handle="${d.key}"][data-point="${d.point}"][data-handle-kind="${d.kind}"]`)?.focus({ preventScroll: true });
    }
    keydown(e) {
      if (e.target.dataset.regCurveValue && e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        this.commitCurveInput(e.target);
        return;
      }
      if (e.key === "Escape" && this.drag) {
        e.preventDefault();
        e.stopPropagation();
        this.endDrag(null, true);
        return;
      }
      const resize2 = e.target.closest("[data-reg-curve-resize]");
      if (resize2 && ["ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        const key2 = resize2.dataset.regCurveResize;
        this.setCurveHeight(key2, e.key === "Home" ? CURVE_HEIGHT.min : e.key === "End" ? CURVE_HEIGHT.max : this.curveSize(key2).height + (e.key === "ArrowUp" ? -1 : 1) * (e.shiftKey ? 40 : 10));
        return;
      }
      const h = e.target.closest("[data-reg-handle]");
      if (!h || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
      e.preventDefault();
      e.stopPropagation();
      const key = h.dataset.regHandle, n = Number(h.dataset.point), kind = h.dataset.handleKind, c = this.session.values[key], horizontal = ["ArrowLeft", "ArrowRight"].includes(e.key), delta = (e.shiftKey ? 0.1 : 0.01) * (["ArrowLeft", "ArrowDown"].includes(e.key) ? -1 : 1);
      if (kind === "value") this.editCurve(key, (horizontal ? "x" : "y") + n, c[(horizontal ? "x" : "y") + n] + delta);
      else {
        const influence = n === 1 ? c.x1 : 1 - c.x2, speed = endpointSpeed(c, n), g = curveGeometry(c, "speed", this.curveSize(key));
        if (kind === "speed-value" && horizontal) return;
        const next = fromSpeed(c, n, influence + (horizontal ? delta * (n === 1 ? 1 : -1) : 0), (Number.isFinite(speed) ? speed : speed > 0 ? g.max : g.min) + (horizontal ? 0 : delta));
        if (this.session.set(key, next)) this.repaintCurve(key);
      }
      const current = this.root.querySelector(`[data-reg-handle="${key}"][data-point="${n}"][data-handle-kind="${kind}"]`);
      current?.focus({ preventScroll: true });
      this.curveNotice(key, current?.getAttribute("aria-label")?.split(";")[0] || "");
    }
    openPicker(key) {
      if (this.pickerKey === key) {
        this.closePicker();
        this.syncFields(key);
        return;
      }
      this.closePicker(false);
      for (const p of this.closingPickers) p.destroy({ restoreFocus: false });
      this.closingPickers.clear();
      const color = parseColor(this.session.values[key]), anchor = () => this.root.querySelector(`[data-reg-color="${key}"]`);
      this.pickerKey = key;
      this.picker = new ColorPicker(this.root.parentElement, { anchor, rgb: [color.r, color.g, color.b].map((v) => v / 255), allowAlpha: false, title: this.t(this.session.field(key).labelKey), onPreview: (value2) => {
        const chip = anchor()?.querySelector("i");
        if (chip) chip.style.background = toHex({ r: value2.rgb[0] * 255, g: value2.rgb[1] * 255, b: value2.rgb[2] * 255 });
      }, onApply: (value2) => {
        this.session.set(key, toHex({ r: value2.rgb[0] * 255, g: value2.rgb[1] * 255, b: value2.rgb[2] * 255 }));
        this.closePicker();
        this.syncFields(key);
        this.paint();
      }, onCancel: ({ restoreFocus: restoreFocus2 = true } = {}) => {
        this.closePicker(restoreFocus2);
        this.syncFields(key);
      }, returnFocus: () => anchor()?.focus({ preventScroll: true }) });
    }
    closePicker(restoreFocus2 = true) {
      if (!this.picker) return;
      const p = this.picker, key = this.pickerKey;
      this.picker = null;
      this.pickerKey = null;
      if (!restoreFocus2) p.returnFocus = () => {
      };
      this.root.querySelector(`[data-reg-color="${key}"]`)?.setAttribute("aria-expanded", "false");
      this.closingPickers.add(p);
      p.close().then(() => this.closingPickers.delete(p));
    }
    snapshot() {
      return { session: this.session.snapshot(), ui: clone(this.ui), feedback: this.busy ? "Preview interrupted · Ready to retry" : this.feedback, scroll: this.root.querySelector(".reg-body")?.scrollTop || 0, formScroll: this.root.querySelector(".reg-form")?.scrollTop || 0 };
    }
    destroy() {
      disposeControls(this.root);
      this.endDrag(null, true);
      this.graphObserver?.disconnect();
      sessions.set(this.sessionKey, this.snapshot());
      this.abort.abort();
      clearTimeout(this.pendingTimer);
      this.finishPending?.();
      this.picker?.destroy({ restoreFocus: false });
      for (const p of this.closingPickers) p.destroy({ restoreFocus: false });
      this.closingPickers.clear();
    }
  };

  // client/reference/src/registry.js
  var ReferenceRegistry = class extends RegistryView {
    constructor(root2, id, options = {}) {
      super(root2, id, options);
      this.checkpoint = JSON.stringify(this.session.values);
      window.addEventListener("blur", () => this.endDrag(null, true), { signal: this.abort.signal });
      root2.addEventListener("focusout", (e) => {
        if (isNumber(e.target) && e.target.dataset.regValue) this.commitNumber(e.target);
      }, { signal: this.abort.signal });
      root2.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.isComposing && isNumber(e.target) && e.target.dataset.regValue) {
          e.preventDefault();
          this.commitNumber(e.target);
        }
      }, { signal: this.abort.signal });
    }
    fieldHTML(field2, index) {
      let html = super.fieldHTML(field2, index);
      if (field2.trackMax !== void 0) html = html.replace(/<input type="range"[^>]+>/, (tag) => tag.replace(/ max="[^"]*"/, "").replace(/ min="[^"]*"/, "").replace(">", ' min="' + (field2.trackMin ?? field2.min ?? 0) + '" max="' + field2.trackMax + '">'));
      if (field2.descriptionKey && !field2.hintKey) html += `<p class="reg-hint">${esc(this.t(field2.descriptionKey))}</p>`;
      if (!this.session.enabled(field2)) html += `<p class="reg-hint ref-disabled">${esc(copy(field2.disabledReason || "") || bilingual("Unavailable in the selected fixture context.", "在所选模拟上下文中不可用。"))} ${esc(field2.enabledWhen?.stateKey || "")}</p>`;
      return html;
    }
    input(e) {
      const el = e.target, key = el.dataset.regValue, field2 = key && this.session.field(key);
      if (isNumber(el) && field2) {
        const raw = el.value, n = Number(raw);
        if (raw === "" || !Number.isFinite(n) || n < (field2.min ?? -Infinity) || n > (field2.max ?? Infinity)) {
          el.setAttribute("aria-invalid", "true");
          return;
        }
      }
      super.input(e);
    }
    commitNumber(el) {
      const key = el.dataset.regValue, field2 = this.session.field(key);
      if (!field2 || el.disabled) return;
      const next = normalizeField(field2, el.value);
      if (next !== void 0) this.session.set(key, next);
      el.value = this.session.values[key];
      el.removeAttribute("aria-invalid");
      this.syncFields(key);
      this.paint();
    }
    change(e) {
      if (isNumber(e.target) && e.target.dataset.regValue) {
        this.commitNumber(e.target);
        return;
      }
      super.change(e);
    }
    endDrag(e, cancel = false) {
      super.endDrag(e, cancel || e?.type === "lostpointercapture");
    }
    get dirty() {
      return this.busy || !!this.picker || !!this.drag || !!this.root.querySelector('[aria-invalid="true"]') || this.checkpoint !== JSON.stringify(this.session.values);
    }
    save() {
      this.root.querySelectorAll("input[type=number][data-reg-value]").forEach((el) => this.commitNumber(el));
      this.checkpoint = JSON.stringify(this.session.values);
      return true;
    }
    discard() {
      this.endDrag(null, true);
      this.closePicker(false);
      this.session.values = JSON.parse(this.checkpoint);
      this.render();
    }
  };

  // client/reference/src/settings.js
  var fields = DATA.settings.sections.flatMap((s) => s.fields);
  var colorValue = (value2) => {
    if (typeof value2 === "object") return value2;
    const rgb = String(value2).match(/rgba?\(([^)]+)\)/)?.[1].split(",").map(Number);
    return rgb ? { color: "#" + rgb.slice(0, 3).map((n) => Math.round(n).toString(16).padStart(2, "0")).join(""), alpha: rgb[3] ?? 1 } : { color: value2, alpha: 1 };
  };
  var curveDefault = (value2) => {
    const n = String(value2 || "cubic-bezier(.2,0,.2,1)").match(/-?\d*\.?\d+/g).map(Number);
    return { x1: n[0], y1: n[1], x2: n[2], y2: n[3] };
  };
  function tuningValue(p) {
    const raw = DATA.variables[p.cssProperty];
    if (p.type === "cubicBezier") return curveDefault(raw);
    if (p.type === "durationMs") return DATA.durations[p.motionRole];
    if (p.type === "colorAlpha") return colorValue(raw);
    if (p.type === "shadow") {
      const n = raw.split("rgba")[0].trim().split(/\s+/).map(parseFloat);
      return { offsetX: n[0], offsetY: n[1], blur: n[2], spread: n[3] || 0, ...colorValue(raw) };
    }
    return Number.parseFloat(raw) || p.editing?.trackMin || 0;
  }
  function expand(p, value2) {
    const base = { key: p.id, labelKey: p.labelKey || "settings.designTuning.parameter." + p.id, descriptionKey: p.descriptionKey || p.presentation?.descriptionKey, defaultValue: value2, readonly: p.disposition === "PROTECTED", disabled: p.disposition === "PROTECTED", disabledReason: p.reason }, type = p.controlType || p.type;
    if (type === "colorAlpha" || type === "shadow") {
      const parts = type === "shadow" ? ["offsetX", "offsetY", "blur", "spread", "color", "alpha"] : ["color", "alpha"];
      return parts.map((k) => ({ ...base, key: p.id + "." + k, labelKey: base.labelKey + " · " + k, type: k === "color" ? "color" : "number", defaultValue: value2[k], min: k === "alpha" ? 0 : k === "blur" ? 0 : -100, max: k === "alpha" ? 1 : 100, step: k === "alpha" ? 0.01 : 1 }));
    }
    return [{ ...base, type: type === "cubicBezier" ? "cubicBezier" : type === "color" ? "color" : "range", min: p.validation?.min ?? p.validity?.min ?? 0, max: p.validation?.max ?? p.validity?.max, trackMin: p.editing?.trackMin, trackMax: p.editing?.trackMax, step: p.validation?.step ?? p.editing?.step ?? 0.01 }];
  }
  var appearance = DATA.appearance.flatMap((p) => expand(p, p.controlType === "color" ? colorValue(DATA.defaults[p.id]).color : DATA.defaults[p.id]));
  var tuning = DATA.tuning.map((p) => ({ ...p, value: tuningValue(p) }));
  var schema = { id: "referenceSettings", i18n: DATA.dictionaries, actions: [], hideRestoreDefaults: true, sections: [
    { id: "general", labelKey: "settings.navigation.general", fields: [...fields.filter((f) => f.key === "language"), ...appearance.filter((f) => ["layout.scale", "motion.speed"].includes(f.key))] },
    { id: "appearance", labelKey: "settings.navigation.appearance", fields: appearance.filter((f) => !["layout.scale", "motion.speed"].includes(f.key)) },
    { id: "icons", labelKey: "settings.theme.toolIconAppearance", defaultCollapsed: true, fields: fields.filter((f) => ["proceduralIconMode", "toolIconDarkSourceMode", "toolIconDarkPaletteId", "toolIconColor", "toolIconLine"].includes(f.key)).map((f) => ({ ...f, options: f.options?.length ? f.options : [{ value: "fixture", labelKey: "reference.fixturePalette" }] })) },
    { id: "background", labelKey: "section.backgroundEngine", defaultCollapsed: true, fields: DATA.settings.sections.find((s) => s.id === "backgroundEngine").fields.filter((f) => f.type !== "button").map((f) => ({ ...f, key: "background." + f.key, visibleWhen: void 0, enabledWhen: void 0, options: f.options?.length ? f.options : [{ value: "fixture", labelKey: "reference.fixturePalette" }] })) },
    { id: "advanced", labelKey: "settings.navigation.advanced", defaultCollapsed: true, fields: [...fields.filter((f) => f.key === "registryDebugTools"), ...DATA.settings.sections.find((s) => s.id === "vela").fields.map((f) => ({ ...f, readonly: true, descriptionKey: "reference.fixture" }))] },
    { id: "developer", labelKey: "settings.navigation.developer", defaultCollapsed: true, fields: fields.filter((f) => ["homeIconRadius", "homeDragShadowIntensity"].includes(f.key)) },
    ...[...new Set(tuning.map((p) => p.domain))].map((domain) => ({ id: "tuning-" + domain, labelKey: ["settings", "designTuning", domain === "componentOptics" ? "controls" : domain, "title"].join("."), defaultCollapsed: true, fields: tuning.filter((p) => p.domain === domain).flatMap((p) => expand(p, p.value)) })),
    { id: "procedural", labelKey: "settings.developer.homeCalibration", defaultCollapsed: true, fields: DATA.settings.sections.find((s) => s.id === "proceduralAppearance").fields.filter((f) => f.type !== "button") }
  ] };
  REGISTRY_SCHEMAS.settings = schema;
  var settingsStore = new MemoryStore({ values: Object.fromEntries(schema.sections.flatMap((s) => s.fields).map((f) => [f.key, f.defaultValue])), overrides: [] });
  var SettingsView = class extends ReferenceRegistry {
    constructor(root2) {
      super(root2, "settings", { saved: { session: { values: settingsStore.data.values }, ui: { previewOpen: true } }, sessionKey: "reference-settings" });
      this.store = settingsStore;
      this.root.classList.add("settings-reference");
      this.session.setContext("text");
      root2.addEventListener("click", (e) => {
        if (e.target.closest("[data-settings-play]")) this.root.querySelector(".ref-settings-preview").classList.toggle("playing");
      }, { signal: this.abort.signal });
    }
    t(key) {
      if (key?.includes(" · ")) {
        const [base, part] = key.split(" · ");
        return super.t(base) + " · " + copy(part);
      }
      return super.t(key);
    }
    previewHTML() {
      return `<div class="ref-settings-preview"><strong>${esc(bilingual("Live appearance preview", "外观实时预览"))}</strong><p>${esc(bilingual("Long supporting text remains readable in a compact field group.", "紧凑字段分组中的长说明仍应清晰可读。"))}</p><button class="primary-button" data-settings-play>${esc(bilingual("Preview motion", "预览动效"))}</button><span class="ref-motion-dot" aria-hidden="true"></span><input aria-label="${copy("Preview field")}" value="Lomond Cabinet"><span class="ref-state">${esc(bilingual("Selected · Focus · Error", "已选择 · 焦点 · 错误"))}</span><output data-tuning-output></output></div>`;
    }
    paint() {
      super.paint();
      const root2 = this.root.querySelector(".ref-settings-preview");
      if (!root2) return;
      const v = this.session.values, baseline = this.checkpoint ? JSON.parse(this.checkpoint) : {}, changed = (id) => settingsStore.data.overrides.includes(id) || this.checkpoint && JSON.stringify(baseline[id]) !== JSON.stringify(v[id]);
      const map = { "base.accent": "--accent", "base.canvas": "--stage", "surface.panel": "--surface", "text.primary": "--text" };
      for (const [id, property] of Object.entries(map)) if (changed(id)) root2.style.setProperty(property, v[id]);
      else root2.style.removeProperty(property);
      const applied = [];
      for (const p of DATA.tuning) {
        const compound = ["shadow", "colorAlpha"].includes(p.type), parts = compound ? Object.keys(tuning.find((q) => q.id === p.id).value) : [], value2 = compound ? Object.fromEntries(parts.map((k) => [k, v[p.id + "." + k]])) : v[p.id], isChanged = compound ? parts.some((k) => changed(p.id + "." + k)) : changed(p.id);
        if (!isChanged) continue;
        let css = String(value2);
        if (p.type === "cubicBezier") css = `cubic-bezier(${value2.x1},${value2.y1},${value2.x2},${value2.y2})`;
        if (p.type === "lengthPx") css = value2 + "px";
        if (p.type === "percentage") css = value2 + "%";
        if (compound) {
          const hex2 = value2.color.slice(1), rgb = [0, 2, 4].map((i) => parseInt(hex2.slice(i, i + 2), 16)), color = `rgba(${rgb},${value2.alpha})`;
          css = p.type === "shadow" ? `${value2.offsetX}px ${value2.offsetY}px ${value2.blur}px ${value2.spread}px ${color}` : color;
        }
        if (p.cssProperty) root2.style.setProperty(p.cssProperty, css);
        applied.push(p.id + " = " + css);
      }
      root2.style.fontSize = 13 * (v["typography.body.size"] || 1) + "px";
      root2.style.setProperty("--ref-motion-ms", (v["motion.duration.viewContentEnter"] || DATA.durations.viewContentEnter) + "ms");
      root2.querySelector("[data-tuning-output]").textContent = applied.slice(-3).join("\n");
    }
    save() {
      super.save();
      settingsStore.change((d) => {
        d.overrides = Object.keys(this.session.values).filter((k) => this.session.values[k] !== schema.sections.flatMap((s) => s.fields).find((f) => f.key === k)?.defaultValue);
        d.values = { ...this.session.values };
      });
      const result = settingsStore.flush();
      if (!result.fixtureSaved) this.checkpoint = JSON.stringify(settingsStore.saved.values);
      return result.fixtureSaved;
    }
    discard() {
      settingsStore.reload();
      this.session.values = { ...settingsStore.data.values };
      this.checkpoint = JSON.stringify(this.session.values);
      this.render();
    }
    reset() {
      this.session.values = Object.fromEntries(schema.sections.flatMap((s) => s.fields).map((f) => [f.key, f.defaultValue]));
      this.render();
    }
  };

  // client/reference/src/lab/view-focus.js
  var identity = ["data-pal-field", "data-cv-field", "data-pal-action", "data-cv-action", "data-group-name", "data-cv-group", "data-stop", "data-cv-handle", "data-cv-node", "data-id"];
  function captureFocus(root2) {
    const active = document.activeElement, el = active?.hasAttribute("data-reference-select") ? active.closest(".custom-select").previousElementSibling : active;
    if (!el || !root2.contains(el)) return null;
    return { attrs: identity.filter((k) => el.hasAttribute(k)).map((k) => [k, el.getAttribute(k)]), palette: el.closest("[data-palette]")?.dataset.palette, tag: el.tagName, selection: ["search", "text"].includes(el.type) ? [el.selectionStart, el.selectionEnd] : null };
  }
  function restoreFocus(root2, saved, fallback) {
    if (!saved) return;
    let scope = root2;
    if (saved.palette) scope = [...root2.querySelectorAll("[data-palette]")].find((el) => el.dataset.palette === saved.palette) || root2;
    let target = saved.attrs.length ? [...scope.querySelectorAll(saved.tag)].find((el) => saved.attrs.every(([k, v]) => el.getAttribute(k) === v)) : null;
    if (target?.disabled || target?.closest("[hidden]")) target = null;
    target = target || root2.querySelector(fallback);
    (target?._coreSelectComponent?.trigger || target)?.focus({ preventScroll: true });
    if (saved.selection && target?.setSelectionRange) target.setSelectionRange(...saved.selection);
  }

  // client/reference/src/lab/palette-view.js
  var esc5 = (value2) => String(value2).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  var button = (action, label2, extra = "") => `<button type="button" data-pal-action="${action}" ${extra}>${label2}</button>`;
  var selected = (a, b) => a === b ? "selected" : "";
  var paintImage = (s, w = 240, h = 112, ramp = false) => `<img data-paint="${s.id}" data-w="${w}" data-h="${h}" ${ramp ? 'data-ramp="true"' : ""} src="${paintURL(s.paint, w, h, ramp)}" alt="" draggable="false">`;
  var field = (label2, key, value2, { min = 0, max = 100, step = 1 } = {}) => `<label class="pal-field"><span>${label2}</span><input type="number" data-pal-field="${key}" value="${value2}" min="${min}" max="${max}" step="${step}"></label>`;
  var PaletteView = class {
    constructor(root2, snapshot = {}) {
      const { picker, ...savedUI } = snapshot;
      this.root = root2;
      this.closingPickers = /* @__PURE__ */ new Set();
      this.store = paletteStore();
      this.ui = { page: "library", paletteId: null, slotId: null, group: "all", type: "all", query: "", channel: "color", stopId: null, groups: false, ...savedUI };
      this.abort = new AbortController();
      this.notice = "";
      const options = { signal: this.abort.signal };
      root2.addEventListener("click", (e) => this.click(e), options);
      root2.addEventListener("input", (e) => this.input(e), options);
      root2.addEventListener("change", (e) => this.change(e), options);
      root2.addEventListener("pointerdown", (e) => this.dragStop(e), options);
      root2.addEventListener("keydown", (e) => this.keydown(e), options);
      root2.addEventListener("focusin", (e) => this.focusStop(e), options);
      this.unsubscribe = this.store.subscribe((kind) => {
        if (this.picker && !this.pickerTargetValid()) {
          this.closePicker();
          this.message(copy("This color changed elsewhere. Reopen the picker to edit its latest value."));
        }
        kind === "render" ? this.render() : kind === "paint" ? this.paint() : kind === "labels" ? this.labels() : this.status();
      });
      this.render();
      if (picker) this.openPicker(picker);
    }
    snapshot() {
      return { ...this.ui, ...this.picker ? { picker: { target: clone2(this.pickerTarget), draft: this.picker.snapshot() } } : {} };
    }
    pickerTargetValid() {
      const t2 = this.pickerTarget, s = this.store.data?.palettes.find((p) => p.id === t2?.paletteId)?.slots.find((s2) => s2.id === t2.slotId);
      return !!s && JSON.stringify(s.paint) === JSON.stringify(t2.paint);
    }
    openPicker(saved) {
      if (this.picker) return;
      const { p, s } = this.current();
      if (!p || !s) return;
      this.ui.page = "palette";
      const targetKey = [p.id, s.id, s.paint.kind === "gradient" ? this.ui.stopId : "solid"].join(":");
      let presence;
      for (const closing of this.closingPickers) {
        if (closing.targetKey === targetKey) presence = closing.capturePresence();
        closing.destroy({ restoreFocus: false });
      }
      this.closingPickers.clear();
      this.pickerTarget = saved?.target || { paletteId: p.id, slotId: s.id, stopId: s.paint.kind === "gradient" ? this.ui.stopId : null, paint: clone2(s.paint) };
      if (!this.pickerTargetValid()) {
        this.pickerTarget = null;
        return;
      }
      const target = this.pickerTarget, paint = target.paint, stop = paint.kind === "gradient" ? paint.colorStops.find((stop2) => stop2.id === target.stopId) : null;
      if (paint.kind === "gradient" && !stop) {
        this.pickerTarget = null;
        return;
      }
      this.picker = new ColorPicker(this.root.parentElement, {
        presence,
        anchor: () => this.root.querySelector('[data-pal-action="open-color"]'),
        rgb: stop ? stop.rgb : paint.rgb,
        opacity: stop ? 1 : paint.opacity,
        allowAlpha: !stop,
        title: stop ? s.name + " · Color stop" : s.name,
        snapshot: saved?.draft,
        onPreview: (value2) => {
          this.pickerDraft = clone2(target.paint);
          if (stop) this.pickerDraft.colorStops.find((s2) => s2.id === target.stopId).rgb = value2.rgb;
          else Object.assign(this.pickerDraft, { rgb: value2.rgb, opacity: value2.opacity });
          this.paintDraft();
        },
        onApply: (value2) => {
          if (!this.pickerTargetValid()) {
            this.closePicker();
            this.message(copy("This color changed elsewhere. Reopen the picker to edit its latest value."));
            return;
          }
          this.closePicker(false);
          this.mutate((data) => {
            const paint2 = data.palettes.find((p2) => p2.id === target.paletteId).slots.find((s2) => s2.id === target.slotId).paint;
            if (stop) paint2.colorStops.find((s2) => s2.id === target.stopId).rgb = value2.rgb;
            else Object.assign(paint2, { rgb: value2.rgb, opacity: value2.opacity });
          }, { undo: "Edit color" });
          this.root.querySelector('[data-pal-action="open-color"]')?.focus({ preventScroll: true });
        },
        onCancel: ({ restoreFocus: restoreFocus2 = true } = {}) => this.closePicker(restoreFocus2),
        returnFocus: () => this.root.querySelector('[data-pal-action="open-color"]')?.focus({ preventScroll: true })
      });
      this.picker.targetKey = targetKey;
      if (saved?.draft) {
        const value2 = this.picker.session.value;
        this.picker.onPreview(value2);
      }
    }
    paintDraft() {
      if (!this.pickerDraft || !this.pickerTarget) return;
      const t2 = this.pickerTarget, paint = this.pickerDraft;
      this.root.querySelectorAll(`[data-paint="${t2.slotId}"]`).forEach((img) => img.src = paintURL(paint, Number(img.dataset.w), Number(img.dataset.h), !!img.dataset.ramp));
      if (this.ui.slotId === t2.slotId) {
        const rgb = paint.kind === "solid" ? paint.rgb : paint.colorStops.find((s) => s.id === t2.stopId)?.rgb;
        if (rgb) {
          this.root.querySelector('[data-pal-action="open-color"]')?.style.setProperty("--color", rgbToHex(rgb));
          const stop = this.root.querySelector(`[data-stop="${t2.stopId}"]`);
          stop?.style.setProperty("--stop", rgbToHex(rgb));
        }
      }
    }
    closePicker(render = true, { animate = true } = {}) {
      if (!this.picker) return;
      const picker = this.picker;
      this.picker = null;
      this.pickerDraft = null;
      this.pickerTarget = null;
      if (animate) {
        this.closingPickers.add(picker);
        picker.close().then(() => this.closingPickers.delete(picker));
      } else picker.destroy({ restoreFocus: false });
      if (render) {
        this.render();
        this.root.querySelector('[data-pal-action="open-color"]')?.focus({ preventScroll: true });
      } else this.paint();
    }
    current() {
      const data = this.store.data, p = data?.palettes.find((p2) => p2.id === this.ui.paletteId), s = p?.slots.find((s2) => s2.id === this.ui.slotId);
      return { data, p, s };
    }
    mutate(fn, options) {
      try {
        this.store.change(fn, options);
        return true;
      } catch (error) {
        this.message(error.message);
        return false;
      }
    }
    edit(fn, kind = "paint", undo = "") {
      const { p, s } = this.current();
      if (!p || !s) return;
      this.mutate((d) => fn(d.palettes.find((x) => x.id === p.id).slots.find((x) => x.id === s.id)), { kind, undo });
    }
    message(text2) {
      text2 = copy(text2);
      this.notice = text2;
      const el = this.root.querySelector(".pal-notice");
      if (el) el.textContent = text2;
    }
    render() {
      const data = this.store.data;
      if (!data) {
        disposeControls(this.root);
        this.root.innerHTML = `<div class="pal-empty"><p>${this.store.status === "loading" ? copy("Loading your palettes…") : esc5(this.store.error)}</p>${this.store.status === "loading" ? "" : button("reload", copy("Try again"))}</div>`;
        return;
      }
      if (!data.palettes.some((p2) => p2.id === this.ui.paletteId)) {
        this.ui.paletteId = data.palettes[0]?.id || null;
        this.ui.slotId = null;
        this.ui.page = "library";
      }
      const { p } = this.current();
      if (p && !p.slots.some((s) => s.id === this.ui.slotId)) this.ui.slotId = p.slots[0]?.id || null;
      const savedFocus = captureFocus(this.root);
      const scroll = this.root.querySelector(".pal-catalog")?.scrollTop || 0, detailScroll = this.root.querySelector(".pal-detail")?.scrollTop || 0;
      disposeControls(this.root);
      this.root.innerHTML = `<div class="palette-workspace" data-page="${this.ui.page}"><section class="pal-library" aria-label="${copy("Palette library")}"><div class="pal-library-top"><div class="pal-search-row"><input type="search" data-pal-field="search" aria-label="${copy("Search palettes, slots or HEX")}" placeholder="${copy("Search palettes or HEX…")}" value="${esc5(this.ui.query)}">${button("new-palette", copy("+ New"), 'class="primary-button"')}</div><div class="pal-filter-row"><select data-pal-field="group-filter" aria-label="${copy("Filter by group")}"><option value="all">${copy("All groups")}</option><option value="none" ${selected(this.ui.group, "none")}>${copy("Ungrouped")}</option>${data.groups.map((g) => `<option value="${g.id}" ${selected(this.ui.group, g.id)}>${esc5(g.name)}</option>`).join("")}</select><select data-pal-field="type-filter" aria-label="${copy("Filter by paint type")}"><option value="all">${copy("All colors")}</option><option value="solid" ${selected(this.ui.type, "solid")}>${copy("With solids")}</option><option value="gradient" ${selected(this.ui.type, "gradient")}>${copy("With gradients")}</option></select>${button("groups", copy("Groups"), `aria-expanded="${this.ui.groups}"`)}</div>${this.ui.groups ? this.groupManager(data) : ""}</div><div class="pal-catalog">${this.catalog(data)}</div></section><section class="pal-detail" aria-label="${copy("Palette editor")}">${p ? this.detail() : `<div class="pal-empty"><p>${copy("Create a palette to begin.")}</p></div>`}</section></div><div class="pal-library-footer"><span class="pal-save-status" role="status"></span><div>${button("undo", copy("Undo"), this.store.undoEntry ? "" : "hidden")}${button("retry-save", copy("Retry save"), "hidden")}${button("reload", copy("Reload saved"), "hidden")}<details class="pal-file-menu"><summary>${copy("Library")}</summary><div>${button("export", copy("Export library"))}${button("import", copy("Import palettes"))}<input type="file" data-pal-import accept=".json,application/json" hidden></div></details></div></div><p class="pal-notice" role="status">${esc5(this.notice)}</p>`;
      this.root.querySelector(".pal-catalog").scrollTop = scroll;
      this.root.querySelector(".pal-detail").scrollTop = detailScroll;
      this.status();
      this.paintDraft();
      this.picker?.schedulePosition();
      mountControls(this.root);
      restoreFocus(this.root, savedFocus, this.ui.page === "library" ? '[data-pal-field="search"]' : '[data-pal-field="palette-name"]');
    }
    groupManager(data) {
      return `<div class="pal-group-manager"><div class="pal-new-group"><input data-pal-field="new-group" maxlength="80" placeholder="${copy("New group name")}" aria-label="${copy("New group name")}">${button("add-group", copy("Add"))}</div>${data.groups.map((g) => `<div class="pal-group-row"><input data-group-name="${g.id}" aria-label="${esc5(copy("Rename {name} group", { name: g.name }))}" value="${esc5(g.name)}" maxlength="80"><span>${data.palettes.filter((p) => p.groupId === g.id).length}</span>${button("delete-group", "×", `data-id="${g.id}" aria-label="${esc5(copy("Delete {name} group; keep its palettes", { name: g.name }))}" title="${copy("Delete group; keep palettes")}"`)}</div>`).join("")}</div>`;
    }
    catalog(data) {
      const list = filterPalettes(data, this.ui);
      return `<div class="pal-count">${copy("{count} palettes", { count: list.length })}</div>${list.length ? list.map((p) => `<article class="pal-card ${p.id === this.ui.paletteId ? "is-selected" : ""}" data-palette="${p.id}"><div class="pal-card-swatches">${p.slots.length ? p.slots.slice(0, 8).map((s) => `<button type="button" data-pal-action="open-slot" data-id="${s.id}" title="${esc5(s.name)}" aria-label="${esc5(copy("Edit {slot} in {palette}", { slot: s.name, palette: p.name }))}" class="pal-swatch">${paintImage(s, 80, 96)}</button>`).join("") : button("open", copy("Add your first color"), 'class="pal-card-empty"')}</div><div class="pal-card-caption">${button("open", `<strong>${esc5(p.name)}</strong><span>${esc5(data.groups.find((g) => g.id === p.groupId)?.name || copy("Ungrouped"))} · ${copy("{count} slots", { count: p.slots.length })}</span>`, 'class="pal-card-name"')}${button("copy-palette", "⧉", `class="pal-small-button" aria-label="${esc5(copy("Duplicate {name}", { name: p.name }))}" title="${copy("Duplicate palette")}"`)}${button("delete-palette", "×", `class="pal-small-button" aria-label="${esc5(copy("Delete {name}", { name: p.name }))}" title="${copy("Delete palette")}"`)}</div></article>`).join("") : `<div class="pal-empty"><p>${data.palettes.length ? copy("No matching palettes.") : copy("Your library is empty.")}</p>${button(data.palettes.length ? "clear-filters" : "new-palette", data.palettes.length ? copy("Clear filters") : copy("Create a palette"))}</div>`}`;
    }
    detail() {
      const { data, p, s } = this.current();
      return `<div class="pal-detail-top">${button("back", copy("‹ Library"), 'class="pal-back"')}<input class="pal-title" data-pal-field="palette-name" aria-label="${copy("Palette name")}" value="${esc5(p.name)}" maxlength="80"><div class="pal-detail-meta"><select data-pal-field="palette-group" aria-label="${copy("Palette group")}"><option value="none">${copy("Ungrouped")}</option>${data.groups.map((g) => `<option value="${g.id}" ${selected(p.groupId, g.id)}>${esc5(g.name)}</option>`).join("")}</select>${button("copy-palette", copy("Duplicate"))}${button("delete-palette", copy("Delete"))}</div></div><div class="pal-slot-section"><div class="pal-section-label"><span>${copy("Slots")} <span class="pal-muted">${p.slots.length}</span></span><div>${button("add-solid", copy("+ Solid"))}${button("add-gradient", copy("+ Gradient"))}</div></div><div class="pal-slots">${p.slots.map((s2, i) => `<button type="button" class="pal-slot" data-pal-action="select-slot" data-id="${s2.id}" aria-pressed="${s2.id === this.ui.slotId}" title="${esc5(s2.name)}"><span class="pal-swatch">${paintImage(s2, 64, 64)}</span><span>${esc5(s2.name)}</span></button>`).join("")}</div></div>${s ? this.editor(s) : `<div class="pal-empty"><p>${copy("Add a solid color or a gradient.")}</p></div>`}`;
    }
    editor(s) {
      const p = s.paint, gradientPaint = p.kind === "gradient";
      return `<div class="pal-editor"><div class="pal-editor-heading"><input data-pal-field="slot-name" aria-label="${copy("Slot name")}" maxlength="80" value="${esc5(s.name)}"><div>${button("slot-left", "←", `aria-label="${copy("Move slot earlier")}" title="${copy("Move earlier")}"`)}${button("slot-right", "→", `aria-label="${copy("Move slot later")}" title="${copy("Move later")}"`)}${button("copy-slot", "⧉", `aria-label="${copy("Duplicate slot")}" title="${copy("Duplicate slot")}"`)}${button("delete-slot", "×", `aria-label="${copy("Delete slot")}" title="${copy("Delete slot")}"`)}</div></div><div class="pal-paint-preview pal-swatch">${paintImage(s)}</div><div class="pal-paint-kind"><select data-pal-field="paint-kind" aria-label="${copy("Paint type")}"><option value="solid" ${selected(p.kind, "solid")}>${copy("Solid")}</option><option value="linear" ${selected(gradientPaint ? p.type : "", "linear")}>${copy("Linear gradient")}</option><option value="radial" ${selected(gradientPaint ? p.type : "", "radial")}>${copy("Radial gradient")}</option></select>${gradientPaint ? button("reverse", copy("Reverse")) : button("copy-hex", copy("Copy HEX"))}</div>${gradientPaint ? this.gradientEditor(s) : `<div class="pal-color-controls">${colorControl(`<label class="pal-field pal-hex"><span>HEX</span><input data-pal-field="solid-hex" value="${rgbToHex(p.rgb)}" maxlength="7" spellcheck="false"></label>`, button("open-color", "<span></span>", `class="pal-color-button" style="--color:${rgbToHex(p.rgb)}" aria-haspopup="dialog" aria-expanded="false" aria-label="${copy("Open color picker")}" title="${copy("Open color picker")}"`))}${field(copy("Opacity %"), "solid-opacity", Math.round(p.opacity * 100))}</div>`}<div class="pal-editor-bottom pal-usage">${button("use-accent", copy("Use as accent"), gradientPaint ? `disabled title="${copy("Choose a solid for the accent color")}"` : "")}${button("use-fill", copy("Use for tool icons"))}${button("reset-appearance", copy("Default appearance"))}${button("export-paint", copy("Export paint data"))}<span data-runtime-status role="status"></span></div></div>`;
    }
    gradientEditor(s) {
      const p = s.paint, channel = this.ui.channel, key = channel === "color" ? "colorStops" : "opacityStops", stops = ordered(p[key]);
      if (!stops.some((s2) => s2.id === this.ui.stopId)) this.ui.stopId = stops[0].id;
      const active = stops.find((s2) => s2.id === this.ui.stopId);
      return `<div class="pal-gradient"><div class="pal-channel-tabs" role="group" aria-label="${copy("Gradient stop channel")}">${button("channel-color", copy("Color stops"), `aria-pressed="${channel === "color"}"`)}${button("channel-opacity", copy("Opacity stops"), `aria-pressed="${channel === "opacity"}"`)}</div><div class="pal-stop-track" data-channel="${channel}" aria-label="${copy("Gradient stops")}"><div class="pal-ramp pal-swatch">${paintImage(s, 320, 24, true)}</div>${stops.map((stop) => `<button type="button" class="pal-stop ${stop.id === active.id ? "is-selected" : ""}" data-stop="${stop.id}" style="left:${stop.offset * 100}%;--stop:${channel === "color" ? rgbToHex(stop.rgb) : `rgb(255 255 255 / ${stop.opacity})`}" role="slider" aria-label="${copy("{channel} stop at {percent} percent", { channel: copy(channel === "color" ? "Color" : "Opacity"), percent: Math.round(stop.offset * 100) })}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(stop.offset * 100)}" title="${copy("Drag or use arrow keys")}"></button>`).join("")}</div><div class="pal-stop-actions"><span class="pal-muted">${copy("{count} stops", { count: stops.length })}</span>${button("add-stop", copy("+ Stop"))}${button("delete-stop", copy("Remove"), stops.length <= 2 ? "disabled" : "")}</div><div class="pal-color-controls">${channel === "color" ? `${colorControl(`<label class="pal-field pal-hex"><span>HEX</span><input data-pal-field="stop-hex" value="${rgbToHex(active.rgb)}" maxlength="7" spellcheck="false"></label>`, button("open-color", "<span></span>", `class="pal-color-button" style="--color:${rgbToHex(active.rgb)}" aria-haspopup="dialog" aria-expanded="false" aria-label="${copy("Open stop color picker")}" title="${copy("Open color picker")}"`))}` : field(copy("Opacity %"), "stop-opacity", Math.round(active.opacity * 100))}${field(copy("Position %"), "stop-position", Math.round(active.offset * 1e3) / 10, { step: 0.1 })}</div><label class="pal-angle"><span>${p.type === "linear" ? copy("Angle") : copy("Radius")}<output data-geometry-output>${p.type === "linear" ? Math.round(angleOf(p)) + "°" : Math.round(Math.hypot(p.end[0] - p.start[0], p.end[1] - p.start[1]) * 100) + "%"}</output></span><input type="range" data-pal-field="geometry-slider" min="${p.type === "linear" ? 0 : 1}" max="${p.type === "linear" ? 360 : 150}" value="${p.type === "linear" ? Math.round(angleOf(p)) : Math.round(Math.hypot(p.end[0] - p.start[0], p.end[1] - p.start[1]) * 100)}" aria-label="${p.type === "linear" ? copy("Gradient angle") : copy("Radial radius")}"></label><details class="pal-geometry"><summary>${copy("Position & geometry")}</summary><div class="pal-geometry-fields">${field(copy("Start X %"), "start-x", Math.round(p.start[0] * 100), { min: -200, max: 300 })}${field(copy("Start Y %"), "start-y", Math.round(p.start[1] * 100), { min: -200, max: 300 })}${field(copy("End X %"), "end-x", Math.round(p.end[0] * 100), { min: -200, max: 300 })}${field(copy("End Y %"), "end-y", Math.round(p.end[1] * 100), { min: -200, max: 300 })}${p.type === "radial" ? field(copy("Highlight %"), "highlight-length", Math.round(p.highlightLength * 100), { min: -99, max: 99 }) + field(copy("Highlight angle"), "highlight-angle", p.highlightAngle, { min: -360, max: 360 }) : ""}</div></details></div>`;
    }
    status() {
      const status2 = this.store.status, el = this.root.querySelector(".pal-save-status");
      if (!el) return;
      el.textContent = { loading: copy("Loading…"), saved: copy("Saved"), saving: copy("Saving…"), unsaved: copy("Unsaved changes"), error: copy("Save unavailable"), conflict: copy("Save conflict") }[status2];
      el.title = this.store.error;
      this.root.querySelector('[data-pal-action="undo"]').hidden = !this.store.undoEntry;
      el.dataset.status = status2;
      this.root.querySelector('[data-pal-action="retry-save"]').hidden = !["error"].includes(status2);
      this.root.querySelector('[data-pal-action="reload"]').hidden = status2 !== "conflict";
      if (this.store.error) this.message(this.store.error);
    }
    labels() {
      const { data, p, s } = this.current(), catalog = this.root.querySelector(".pal-catalog"), scroll = catalog.scrollTop;
      catalog.innerHTML = this.catalog(data);
      catalog.scrollTop = scroll;
      for (const [key, value2] of [["palette-name", p?.name], ["slot-name", s?.name]]) {
        const input = this.root.querySelector(`[data-pal-field="${key}"]`);
        if (input && input !== document.activeElement) input.value = value2 || "";
      }
      this.root.querySelectorAll('[data-pal-action="select-slot"]').forEach((b) => {
        const slot2 = p?.slots.find((s2) => s2.id === b.dataset.id);
        if (slot2) {
          b.title = slot2.name;
          b.lastElementChild.textContent = slot2.name;
        }
      });
      this.root.querySelectorAll("select option").forEach((option) => {
        const group = data.groups.find((g) => g.id === option.value);
        if (group) option.textContent = group.name;
      });
      const groupSelect = this.root.querySelector('[data-pal-field="palette-group"]');
      if (groupSelect) for (const option of groupSelect.options) option.selected = option.value === (p?.groupId || "none");
      mountControls(this.root);
      this.root.querySelectorAll("select").forEach((el) => el._coreSelectComponent?.rebuild());
      this.status();
    }
    paint() {
      const { data, s } = this.current();
      if (!data) return;
      const slots = data.palettes.flatMap((p) => p.slots);
      this.root.querySelectorAll("[data-paint]").forEach((img) => {
        const slot2 = slots.find((s2) => s2.id === img.dataset.paint);
        if (slot2) img.src = paintURL(slot2.paint, Number(img.dataset.w), Number(img.dataset.h), !!img.dataset.ramp);
      });
      if (s?.paint.kind === "gradient") {
        const p = s.paint, key = this.ui.channel === "color" ? "colorStops" : "opacityStops";
        for (const stop of p[key]) {
          const b2 = this.root.querySelector(`[data-stop="${stop.id}"]`);
          if (b2) {
            b2.style.left = stop.offset * 100 + "%";
            b2.style.setProperty("--stop", this.ui.channel === "color" ? rgbToHex(stop.rgb) : `rgb(255 255 255 / ${stop.opacity})`);
            b2.setAttribute("aria-valuenow", Math.round(stop.offset * 100));
            b2.setAttribute("aria-label", copy("{channel} stop at {percent} percent", { channel: copy(this.ui.channel === "color" ? "Color" : "Opacity"), percent: Math.round(stop.offset * 100) }));
          }
        }
        const active = p[key].find((a) => a.id === this.ui.stopId), input = this.root.querySelector('[data-pal-field="stop-position"]');
        if (input !== document.activeElement && active) input.value = Math.round(active.offset * 1e3) / 10;
        const out = this.root.querySelector("[data-geometry-output]");
        if (out) out.textContent = p.type === "linear" ? Math.round(angleOf(p)) + "°" : Math.round(Math.hypot(p.end[0] - p.start[0], p.end[1] - p.start[1]) * 100) + "%";
      }
      const color = s?.paint.kind === "solid" ? s.paint.rgb : s?.paint.colorStops?.find((stop) => stop.id === this.ui.stopId)?.rgb, b = this.root.querySelector('[data-pal-action="open-color"]');
      if (b && color) b.style.setProperty("--color", rgbToHex(color));
      this.paintDraft();
      this.status();
    }
    click(e) {
      const b = e.target.closest("[data-pal-action]");
      if (!b || b.disabled) return;
      const action = b.dataset.palAction, card = b.closest("[data-palette]");
      if (card) this.ui.paletteId = card.dataset.palette;
      const { p, s } = this.current();
      if (["use-accent", "use-fill", "reset-appearance"].includes(action)) {
        try {
          if (action === "reset-appearance") resetPaint();
          else usePaint({ paletteId: p.id, slotId: s.id }, action === "use-accent" ? "accent" : "toolFill");
          this.message(action === "reset-appearance" ? "Default appearance restored." : "Applied to the plugin appearance.");
        } catch (error) {
          this.message(error.message);
        }
        return;
      }
      if (action === "open-color") {
        if (this.picker) this.closePicker();
        else this.openPicker();
        return;
      }
      if (action === "open" || action === "open-slot") {
        this.ui.page = "palette";
        this.ui.slotId = action === "open-slot" ? b.dataset.id : p.slots[0]?.id;
        this.render();
        this.root.querySelector('[data-pal-field="palette-name"]')?.focus({ preventScroll: true });
        return;
      }
      if (action === "select-slot") {
        this.ui.slotId = b.dataset.id;
        this.ui.stopId = null;
        this.render();
        return;
      }
      if (action === "back") {
        this.ui.page = "library";
        this.render();
        (this.root.querySelector(`[data-palette="${p.id}"] .pal-card-name`) || this.root.querySelector('[data-pal-field="search"]'))?.focus({ preventScroll: true });
        return;
      }
      if (action === "clear-filters") {
        Object.assign(this.ui, { query: "", group: "all", type: "all" });
        this.render();
        return;
      }
      if (action === "groups") {
        this.ui.groups = !this.ui.groups;
        this.render();
        return;
      }
      if (action === "new-palette") {
        const n = palette(copy("Untitled palette"), this.store.data.groups.some((g) => g.id === this.ui.group) ? this.ui.group : null);
        this.ui.paletteId = n.id;
        this.ui.page = "palette";
        this.mutate((d) => d.palettes.unshift(n));
        this.root.querySelector(".pal-title")?.select();
        return;
      }
      if (action === "copy-palette" && p) {
        const n = copyPalette(p);
        this.ui.paletteId = n.id;
        this.ui.slotId = n.slots[0]?.id;
        this.mutate((d) => d.palettes.splice(d.palettes.findIndex((x) => x.id === p.id) + 1, 0, n));
        this.message(copy("Palette duplicated."));
        return;
      }
      if (action === "delete-palette" && p) {
        this.mutate((d) => d.palettes = d.palettes.filter((x) => x.id !== p.id), { undo: copy("Delete palette") });
        this.message(copy("Palette deleted. Undo is available."));
        return;
      }
      if (action === "add-group") {
        const input = this.root.querySelector('[data-pal-field="new-group"]'), name2 = input.value.trim();
        if (!name2) {
          input.focus();
          return;
        }
        this.mutate((d) => d.groups.push({ id: uid(), name: name2 }));
        return;
      }
      if (action === "delete-group") {
        this.ui.group = "all";
        this.mutate((d) => removeGroup(d, b.dataset.id), { undo: "Delete group" });
        this.message(copy("Group removed. Its palettes are now ungrouped."));
        return;
      }
      if (action === "add-solid" || action === "add-gradient") {
        const n = slot(action === "add-solid" ? copy("New color") : copy("New gradient"), action === "add-solid" ? solid() : gradient());
        this.ui.slotId = n.id;
        this.mutate((d) => d.palettes.find((x) => x.id === p.id).slots.push(n));
        return;
      }
      if (action === "copy-slot" && s) {
        const n = copySlot(s);
        n.name = n.name.slice(0, 75) + " copy";
        this.ui.slotId = n.id;
        this.mutate((d) => {
          const slots = d.palettes.find((x) => x.id === p.id).slots;
          slots.splice(slots.findIndex((x) => x.id === s.id) + 1, 0, n);
        });
        return;
      }
      if (action === "delete-slot" && s) {
        this.mutate((d) => {
          const pal = d.palettes.find((x) => x.id === p.id);
          pal.slots = pal.slots.filter((x) => x.id !== s.id);
        }, { undo: copy("Delete slot") });
        return;
      }
      if (action === "slot-left" || action === "slot-right") {
        this.mutate((d) => {
          const slots = d.palettes.find((x) => x.id === p.id).slots, i = slots.findIndex((x) => x.id === s.id), j = clamp2(i + (action === "slot-left" ? -1 : 1), 0, slots.length - 1);
          [slots[i], slots[j]] = [slots[j], slots[i]];
        });
        return;
      }
      if (action.startsWith("channel-")) {
        this.ui.channel = action.slice(8);
        this.ui.stopId = null;
        this.render();
        return;
      }
      if (action === "add-stop") {
        this.edit((s2) => {
          this.ui.stopId = addStop(s2.paint, this.ui.channel).id;
        }, "render");
        return;
      }
      if (action === "delete-stop") {
        const key = this.ui.channel === "color" ? "colorStops" : "opacityStops";
        this.edit((s2) => {
          if (s2.paint[key].length > 2) s2.paint[key] = s2.paint[key].filter((x) => x.id !== this.ui.stopId);
        }, "render");
        return;
      }
      if (action === "reverse") {
        this.edit((s2) => {
          for (const key of ["colorStops", "opacityStops"]) s2.paint[key] = ordered(s2.paint[key]).reverse().map((stop) => ({ ...stop, offset: 1 - stop.offset }));
        }, "render");
        return;
      }
      if (action === "undo") {
        this.store.undo();
        this.message(copy("Restored."));
        return;
      }
      if (action === "retry-save") {
        this.store.flush();
        return;
      }
      if (action === "reload") {
        this.store.reload();
        return;
      }
      if (action === "export") {
        this.download(this.store.data, "lomond-palettes.json");
        return;
      }
      if (action === "import") {
        this.root.querySelector("[data-pal-import]").click();
        return;
      }
      if (action === "export-paint" && s) {
        this.download({ schema: "lomond.paint-export/1", name: s.name, paint: clone2(s.paint), shapePreview: shapePaint(s.paint) }, "lomond-paint.json");
        return;
      }
      if (action === "copy-hex" && s) navigator.clipboard?.writeText(rgbToHex(s.paint.rgb)).then(() => this.message(copy("HEX copied."))).catch(() => this.message(copy("Select the HEX field to copy this color.")));
    }
    input(e) {
      const key = e.target.dataset.palField;
      if (key === "search") {
        this.ui.query = e.target.value;
        this.render();
        return;
      }
      if (["solid-color", "stop-color", "geometry-slider"].includes(key) || isNumber(e.target)) {
        this.applyField(e.target, false);
      }
    }
    change(e) {
      const input = e.target, key = input.dataset.palField;
      if (input.hasAttribute("data-pal-import")) {
        this.importFile(input.files[0]);
        return;
      }
      if (input.dataset.groupName) {
        this.mutate((d) => d.groups.find((g) => g.id === input.dataset.groupName).name = input.value.trim(), { kind: "labels" });
        return;
      }
      if (!key) return;
      if (key === "group-filter" || key === "type-filter") {
        this.ui[key === "group-filter" ? "group" : "type"] = input.value;
        this.render();
        return;
      }
      if (["search", "new-group"].includes(key)) return;
      this.applyField(input, true);
    }
    applyField(input, commit) {
      const key = input.dataset.palField, { p, s } = this.current(), v = input.value, n = Number(v);
      if (isNumber(input) && (!v || !input.validity.valid)) return;
      if (key === "palette-name") {
        this.mutate((d) => d.palettes.find((x) => x.id === p.id).name = v.trim(), { kind: "labels" });
        return;
      }
      if (key === "palette-group") {
        this.mutate((d) => d.palettes.find((x) => x.id === p.id).groupId = v === "none" ? null : v, { kind: "labels" });
        return;
      }
      if (!s) return;
      if (key === "slot-name") {
        this.edit((s2) => s2.name = v.trim(), "labels");
        return;
      }
      if (key === "paint-kind") {
        this.edit((s2) => {
          if (v === "solid") {
            const opacity = s2.paint.kind === "solid" ? s2.paint.opacity : sampleStops(s2.paint.opacityStops, 0.5, "opacity");
            s2.paint = { ...solid(rgbToHex(s2.paint.kind === "solid" ? s2.paint.rgb : sampleStops(s2.paint.colorStops, 0.5, "rgb"))), opacity };
          } else if (s2.paint.kind === "solid") {
            const hex2 = rgbToHex(s2.paint.rgb), alpha = s2.paint.opacity;
            s2.paint = gradient(hex2, "#E9E9EE", v);
            s2.paint.opacityStops.forEach((o) => o.opacity = alpha);
          } else {
            s2.paint.type = v;
            s2.paint.start = v === "radial" ? [0.5, 0.5] : [0, 0.5];
            s2.paint.end = [1, 0.5];
          }
        }, "render", "Change paint type");
        return;
      }
      this.edit((s2) => {
        const a = s2.paint;
        if (key === "solid-color" || key === "solid-hex") a.rgb = hexToRgb(v);
        if (key === "solid-opacity") a.opacity = n / 100;
        if (a.kind === "gradient") {
          const stops = a[this.ui.channel === "color" ? "colorStops" : "opacityStops"], stop = stops.find((x) => x.id === this.ui.stopId);
          if (key === "stop-color" || key === "stop-hex") stop.rgb = hexToRgb(v);
          if (key === "stop-opacity") stop.opacity = n / 100;
          if (key === "stop-position") stop.offset = n / 100;
          if (key === "geometry-slider") {
            if (a.type === "linear") setAngle(a, n);
            else {
              const r = angleOf(a) * Math.PI / 180;
              a.end = [a.start[0] + Math.cos(r) * n / 100, a.start[1] + Math.sin(r) * n / 100];
            }
          }
          if (["start-x", "start-y", "end-x", "end-y"].includes(key)) {
            const [point, axis] = key.split("-");
            a[point][axis === "x" ? 0 : 1] = n / 100;
          }
          if (key === "highlight-length") a.highlightLength = n / 100;
          if (key === "highlight-angle") a.highlightAngle = n;
        }
      }, "paint");
      if (commit) this.render();
    }
    dragStop(e) {
      const b = e.target.closest("[data-stop]");
      if (!b || e.button !== 0) return;
      e.preventDefault();
      this.ui.stopId = b.dataset.stop;
      this.render();
      const current = this.root.querySelector(`[data-stop="${this.ui.stopId}"]`), track = current.closest(".pal-stop-track"), rect = track.getBoundingClientRect();
      current.focus({ preventScroll: true });
      current.setPointerCapture(e.pointerId);
      const move = (event) => {
        if (event.pointerId !== e.pointerId) return;
        this.edit((s) => {
          const stops = s.paint[this.ui.channel === "color" ? "colorStops" : "opacityStops"];
          stops.find((x) => x.id === this.ui.stopId).offset = Math.round(clamp2((event.clientX - rect.left) / rect.width) * 1e3) / 1e3;
        });
      };
      const end = (event) => {
        if (event.pointerId !== e.pointerId) return;
        current.removeEventListener("pointermove", move);
        for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) current.removeEventListener(type, end);
      };
      current.addEventListener("pointermove", move);
      for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) current.addEventListener(type, end);
    }
    focusStop(e) {
      const stop = e.target.closest("[data-stop]");
      if (!stop || stop.dataset.stop === this.ui.stopId) return;
      this.ui.stopId = stop.dataset.stop;
      this.render();
      this.root.querySelector(`[data-stop="${this.ui.stopId}"]`)?.focus({ preventScroll: true });
    }
    keydown(e) {
      const stop = e.target.closest("[data-stop]");
      if (stop && ["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
        e.preventDefault();
        this.ui.stopId = stop.dataset.stop;
        this.edit((s) => {
          const point = s.paint[this.ui.channel === "color" ? "colorStops" : "opacityStops"].find((x) => x.id === this.ui.stopId);
          point.offset = e.key === "Home" ? 0 : e.key === "End" ? 1 : clamp2(point.offset + (e.key === "ArrowRight" ? 1 : -1) * (e.shiftKey ? 0.1 : 0.01));
        });
      }
      if (e.target.dataset.palField === "new-group" && e.key === "Enter") {
        e.preventDefault();
        this.root.querySelector('[data-pal-action="add-group"]').click();
      }
    }
    download(data, filename) {
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })), a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1e3);
      this.message(copy("Export downloaded."));
    }
    async importFile(file) {
      if (!file) return;
      try {
        if (file.size > 2e6) throw new Error("Choose a library smaller than 2 MB.");
        const source = validateLibrary(JSON.parse(await file.text()));
        const imported = this.mutate((d) => {
          const groups = /* @__PURE__ */ new Map();
          for (const group of source.groups) {
            let target = d.groups.find((g) => g.name.toLocaleLowerCase() === group.name.toLocaleLowerCase());
            if (!target) {
              target = { id: uid(), name: group.name };
              d.groups.push(target);
            }
            groups.set(group.id, target.id);
          }
          for (const p of source.palettes) {
            const copy3 = copyPalette(p);
            copy3.name = p.name;
            copy3.groupId = p.groupId ? groups.get(p.groupId) : null;
            d.palettes.push(copy3);
          }
        }, { undo: copy("Import palettes") });
        if (imported) this.message(copy("Palettes imported. Existing palettes were kept."));
      } catch (error) {
        this.message(error.message);
      }
    }
    destroy() {
      disposeControls(this.root);
      this.closePicker(false, { animate: false });
      for (const picker of this.closingPickers) picker.destroy({ restoreFocus: false });
      this.closingPickers.clear();
      this.abort.abort();
      this.unsubscribe();
    }
  };

  // client/reference/src/lab/curve-view.js
  var cvEsc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  var cvButton = (action, label2, extra = "") => `<button type="button" data-cv-action="${action}" ${extra}>${label2}</button>`;
  var cvNum = (label2, key, value2, min = -400, max = 500, disabled = false) => `<label class="pal-field"><span>${label2}</span><input type="number" data-cv-field="${key}" value="${Number((value2 * 100).toFixed(6))}" min="${min}" max="${max}" step="0.1" ${disabled ? "disabled" : ""}><small class="cv-field-range">${Number(min.toFixed(3))}–${Number(max.toFixed(3))}%</small></label>`;
  var cvSelected = (a, b) => a === b ? "selected" : "";
  var CurveView = class {
    constructor(root2, snapshot = {}) {
      this.root = root2;
      this.store = curveStore();
      this.ui = { page: "library", curveId: null, group: "all", query: "", groups: false, node: 0, playhead: 0, ...snapshot };
      this.abort = new AbortController();
      this.notice = "";
      this.noticeId = "curve-notice-" + uid();
      this.drag = null;
      this.playing = false;
      this.frame = null;
      this.playEpoch = 0;
      this.disposed = false;
      this.ui.playhead = 0;
      const o = { signal: this.abort.signal };
      for (const type of ["click", "input", "change", "focusout", "pointerdown", "keydown"]) root2.addEventListener(type, (e) => this[type](e), o);
      this.unsubscribe = this.store.subscribe((kind) => this.storeUpdate(kind));
      this.unobserve = observeAssets(() => this.usage());
      this.render();
    }
    snapshot() {
      return { ...this.ui, advancedOpen: this.root.querySelector(".cv-advanced")?.open ?? this.ui.advancedOpen, handlesOpen: this.root.querySelector(".cv-handles")?.hasAttribute("open") ?? this.ui.handlesOpen, exportOpen: this.root.querySelector(".cv-export")?.hasAttribute("open") ?? this.ui.exportOpen };
    }
    current() {
      return this.drag?.draft || this.store.data?.curves.find((c) => c.id === this.ui.curveId);
    }
    mutate(fn, options) {
      try {
        this.store.change(fn, options);
        return true;
      } catch (e) {
        this.message(e.message);
        return false;
      }
    }
    edit(fn, kind = "curve-paint", undo = "") {
      const id = this.current()?.id;
      if (!id) return;
      this.mutate((d) => {
        const c = d.curves.find((c2) => c2.id === id);
        if (c) fn(c);
      }, { kind, undo });
    }
    message(text2, error = false) {
      text2 = copy(text2);
      this.notice = text2;
      const el = this.root.querySelector(".cv-notice");
      if (el) {
        el.textContent = text2;
        el.dataset.error = String(error);
      }
    }
    render() {
      this.ui = this.snapshot();
      const data = this.store.data;
      if (!data) {
        disposeControls(this.root);
        this.root.innerHTML = `<div class="pal-empty"><p>${this.store.status === "loading" ? copy("Loading curves…") : cvEsc(this.store.error)}</p>${this.store.status === "loading" ? "" : cvButton("reload", copy("Try again"))}</div>`;
        return;
      }
      if (!this.current()) {
        this.stop(true);
        this.ui.curveId = data.curves[0]?.id || null;
        this.ui.node = 0;
      }
      const c = this.current();
      if (c) this.ui.node = clamp2(this.ui.node, 0, c.nodes.length - 1);
      const savedFocus = captureFocus(this.root), scroll = this.root.querySelector(".cv-catalog")?.scrollTop || 0, detail = this.root.querySelector(".cv-detail")?.scrollTop || 0;
      disposeControls(this.root);
      this.root.innerHTML = `<div class="cv-workspace" data-page="${this.ui.page}"><section class="cv-library" aria-label="${copy("Curve library")}"><div class="pal-library-top"><div class="pal-search-row"><input type="search" data-cv-field="search" placeholder="${copy("Search curves…")}" aria-label="${copy("Search curves")}" value="${cvEsc(this.ui.query)}">${cvButton("new", copy("+ New"), 'class="primary-button"')}</div><div class="pal-filter-row"><select data-cv-field="group-filter" aria-label="${copy("Filter curves by group")}"><option value="all">${copy("All groups")}</option><option value="none" ${cvSelected(this.ui.group, "none")}>${copy("Ungrouped")}</option>${data.groups.map((g) => `<option value="${g.id}" ${cvSelected(g.id, this.ui.group)}>${cvEsc(g.name)}</option>`).join("")}</select>${cvButton("groups", copy("Groups"), `aria-expanded="${this.ui.groups}"`)}</div>${this.ui.groups ? this.groups(data) : ""}</div><div class="cv-catalog">${this.catalog(data)}</div></section><section class="cv-detail" aria-label="${copy("Curve editor")}">${c ? this.editor(c) : `<div class="pal-empty">${copy("Create a curve to begin.")}</div>`}</section></div><div class="pal-library-footer"><span class="cv-save-status" role="status"></span><div>${cvButton("undo", copy("Undo"), this.store.undoEntry ? "" : "hidden")}${cvButton("retry", copy("Retry save"), "hidden")}${cvButton("reload", copy("Reload saved"), "hidden")}<details class="pal-file-menu"><summary>${copy("Library")}</summary><div>${cvButton("export-library", copy("Export library"))}${cvButton("import", copy("Import curves"))}<input data-cv-import type="file" accept=".json,application/json" hidden></div></details></div></div><p id="${this.noticeId}" class="cv-notice pal-notice" role="status">${cvEsc(this.notice)}</p>`;
      this.root.querySelector(".cv-catalog").scrollTop = scroll;
      this.root.querySelector(".cv-detail").scrollTop = detail;
      this.status();
      this.usage();
      this.drawPreview();
      mountControls(this.root);
      restoreFocus(this.root, savedFocus, this.ui.page === "library" ? '[data-cv-field="search"]' : '[data-cv-field="name"]');
    }
    groups(data) {
      return `<div class="pal-group-manager"><div class="pal-new-group"><input data-cv-field="new-group" maxlength="80" placeholder="${copy("New group name")}" aria-label="${copy("New curve group")}">${cvButton("add-group", copy("Add"))}</div>${data.groups.map((g) => `<div class="pal-group-row"><input data-cv-group="${g.id}" value="${cvEsc(g.name)}" maxlength="80" aria-label="${cvEsc(copy("Rename {name}", { name: g.name }))}"><span>${data.curves.filter((c) => c.groupId === g.id).length}</span>${cvButton("delete-group", "×", `data-id="${g.id}" aria-label="${cvEsc(copy("Delete {name} group; keep curves", { name: g.name }))}"`)}</div>`).join("")}</div>`;
    }
    catalog(data) {
      const curves2 = filterCurves(data, this.ui);
      return `<div class="pal-count">${copy("{count} curves", { count: curves2.length })}</div><div class="cv-card-grid">${curves2.map((c) => `<button type="button" class="cv-card" data-cv-action="open" data-id="${c.id}" aria-pressed="${c.id === this.ui.curveId}" title="${cvEsc(c.name)}"><svg viewBox="0 0 140 76" aria-hidden="true"><path class="cv-mini-guide" d="M8 68H132M8 8V68"/><path data-cv-mini="${c.id}" d="${curvePath(c, { width: 140, height: 76, pad: 8 })}"/></svg><strong>${cvEsc(c.name)}</strong><span>${cvEsc(data.groups.find((g) => g.id === c.groupId)?.name || copy("Ungrouped"))}</span></button>`).join("")}</div>${curves2.length ? "" : `<div class="pal-empty"><p>${copy("No matching curves.")}</p>${cvButton("clear", copy("Clear filters"))}</div>`}`;
    }
    editor(c) {
      this.bounds = curveBounds(c);
      const i = this.ui.node, n = c.nodes[i], data = this.store.data, locked = i === 0 || i === c.nodes.length - 1;
      const handles = ["in", "out"].filter((k) => k === "in" ? i > 0 && c.nodes[i - 1].interpolation === "bezier" : i < c.nodes.length - 1 && n.interpolation === "bezier");
      if (!handles.includes(this.ui.selection)) this.ui.selection = "point";
      return `<div class="pal-detail-top">${cvButton("back", copy("‹ Library"), 'class="pal-back"')}<input class="pal-title" data-cv-field="name" value="${cvEsc(c.name)}" maxlength="80" aria-label="${copy("Curve name")}"></div>
  <div class="cv-graph-wrap">${this.graph(c)}</div><div class="cv-graph-caption"><span>${copy("Time →")}</span><span>${copy("Value")} ↑ · ${c.nodes.length}</span>${cvButton("parameters", copy("Edit selected element"))}</div>
  <section class="cv-preview-settings"><div class="cv-demo"><div class="cv-demo-rail"></div><span class="cv-demo-dot"></span></div><div class="cv-playback">${cvButton("play", copy(this.playing ? "Pause" : "Replay"), 'class="secondary-button"')}<input type="range" data-cv-field="playhead" min="0" max="1000" value="${this.ui.playhead * 1e3}" aria-label="${copy("Preview time")}"><output class="cv-preview-value"></output></div><label class="cv-duration"><span>${copy("Duration")}</span><input type="number" data-cv-field="duration" min="80" max="10000" step="10" value="${c.durationMs}" aria-label="${copy("Preview duration in milliseconds")}"><span>ms</span></label><p class="pal-muted">80–10000 ms · ${copy("Duration affects preview playback, not AE keyframes.")}</p></section>
  <section class="cv-parameter-area" aria-label="${copy("Node parameters")}"><header tabindex="-1"><strong>${copy("Selected element")}: ${copy(this.ui.selection === "in" ? "Incoming handle" : this.ui.selection === "out" ? "Outgoing handle" : "Node")} ${i + 1}</strong>${cvButton("graph", copy("Back to curve"))}</header>
  <div class="cv-edit-tools"><select data-cv-field="node" aria-label="${copy("Selected curve point")}">${c.nodes.map((n2, j) => `<option value="${j}" ${cvSelected(j, i)}>${copy("Node")} ${j + 1} · ${Math.round(n2.t * 100)}%</option>`).join("")}</select></div>
  <div class="cv-selection-controls" role="group" aria-label="${copy("Selected element")}">${["point", ...handles].map((k) => cvButton("select-element", copy(k === "point" ? "Node" : k === "in" ? "Incoming handle" : "Outgoing handle"), `data-element="${k}" aria-pressed="${this.ui.selection === k}"`)).join("")}</div>
  ${locked ? `<p class="cv-limit-note">${copy("Endpoints are fixed at (0%, 0%) and (100%, 100%).")}</p>` : this.ui.selection === "point" ? `<fieldset data-cv-parameter="point" class="${(this.ui.selection || "point") === "point" ? "is-selected" : ""}"><legend>${copy("Node parameters")}</legend><div class="cv-point-fields">${cvNum(copy("Time %"), "point-t", n.t, locked ? 0 : c.nodes[i - 1].t * 100 + 0.01, locked ? 100 : c.nodes[i + 1].t * 100 - 0.01, locked)}${cvNum(copy("Value %"), "point-v", n.v, -200, 300, locked)}</div><p>${copy(locked ? "Endpoints are fixed at (0%, 0%) and (100%, 100%)." : "Time position within the curve; 0–100%.")} ${copy("Value relative to the unit interval; values may overshoot.")}</p></fieldset>` : ""}

  <div class="cv-handles">${this.handleFields(c)}</div></section>

  <details class="cv-advanced" ${this.ui.advancedOpen ? "open" : ""}><summary>${copy("Curve type, structure & UI motion")}</summary>
  <div class="cv-edit-tools"><select data-cv-field="interpolation" aria-label="${copy("Outgoing interpolation")}" ${i === c.nodes.length - 1 ? "disabled" : ""}>${["bezier", "linear", "hold"].map((k) => `<option value="${k}" ${cvSelected(n.interpolation, k)}>${k === "bezier" ? "Bézier" : copy(k === "linear" ? "Linear" : "Hold")}</option>`).join("")}</select>${cvButton("flat", copy("Flat tangents"))}${cvButton("reverse", copy("Reverse"), c.nodes.some((n2) => n2.interpolation === "hold") ? "disabled" : "")}</div>
  <div class="cv-edit-tools">${cvButton("add-point", copy("+ Point"), i === c.nodes.length - 1 || c.nodes.length >= 128 ? "disabled" : "")}${cvButton("remove-point", copy("Remove"), locked ? "disabled" : "")}</div><div class="pal-detail-meta"><select data-cv-field="curve-group" aria-label="${copy("Curve group")}"><option value="none">${copy("Ungrouped")}</option>${data.groups.map((g) => `<option value="${g.id}" ${cvSelected(c.groupId, g.id)}>${cvEsc(g.name)}</option>`).join("")}</select>${cvButton("duplicate", copy("Duplicate"))}${cvButton("delete", copy("Delete"))}</div>
  <p class="cv-edit-hint">${copy("Drag a point or its handles. Arrow keys fine-tune; Shift moves faster. Split a segment to add a point without changing its shape.")}</p>
  <div class="cv-use"><div><span class="pal-muted">${copy("Plugin motion")}</span><strong data-cv-usage></strong></div>${cvButton("use", copy("Use for UI motion"), 'class="primary-button"')}${cvButton("default-motion", copy("Default spring"))}<p class="pal-muted">${copy("Uses this curve with a duration up to 3000 ms.")} ${copy("This controls the reference UI motion only; it does not execute a curve in AE.")}</p><span data-runtime-status role="status"></span></div></details>`;
    }
    handleFields(c) {
      const i = this.ui.node, n = c.nodes[i];
      return ["in", "out"].map((kind) => {
        const incoming = kind === "in", exists = incoming ? i > 0 : i < c.nodes.length - 1, enabled = exists && (incoming ? c.nodes[i - 1] : n).interpolation === "bezier", point = exists ? incoming ? curveSegment(c.nodes[i - 1], n)[2] : curveSegment(n, c.nodes[i + 1])[1] : null;
        if (!exists) return "";
        if (!enabled) return `<p class="cv-limit-note">${copy(incoming ? "Incoming handle" : "Outgoing handle")} · ${copy("Handles apply only to Bézier segments. Choose Bézier to edit.")} ${cvButton("structure", copy("Curve type"))}</p>`;
        if (this.ui.selection !== kind) return "";
        return `<fieldset data-cv-parameter="${kind}" class="${this.ui.selection === kind ? "is-selected" : ""}"><legend>${copy(incoming ? "Incoming handle" : "Outgoing handle")}</legend>${point ? `<div class="cv-handle-fields">${cvNum(copy("Time %"), kind + "-t", point[0], (incoming ? c.nodes[i - 1].t : n.t) * 100, (incoming ? n.t : c.nodes[i + 1].t) * 100, !enabled)}${cvNum(copy("Value %"), kind + "-v", point[1], -400, 500, !enabled)}</div>` : ""}<p>${copy(!exists ? incoming ? "No incoming segment at the first node." : "No outgoing segment at the last node." : enabled ? "Time is bounded by the adjacent nodes. Value range: −400–500%." : "Handles apply only to Bézier segments. Choose Bézier to edit.")}</p></fieldset>`;
      }).join("");
    }
    coords(t2, v) {
      const b = this.dragBounds || this.bounds;
      return [24 + t2 * 352, 24 + (b.max - v) / (b.max - b.min) * 200];
    }
    graph(c) {
      const [x0, y0] = this.coords(0, 0), [x1, y1] = this.coords(1, 1), i = this.ui.node, n = c.nodes[i];
      let handles = "";
      for (const kind of ["in", "out"]) {
        const p = kind === "in" && i ? curveSegment(c.nodes[i - 1], n)[2] : kind === "out" && i < c.nodes.length - 1 ? curveSegment(n, c.nodes[i + 1])[1] : null;
        if (p && (kind === "in" ? c.nodes[i - 1] : n).interpolation === "bezier") {
          const [x, y] = this.coords(...p), [nx, ny] = this.coords(n.t, n.v);
          handles += `<line data-cv-line="${kind}" x1="${nx}" y1="${ny}" x2="${x}" y2="${y}"/><circle data-cv-handle="${kind}" data-cv-node="${i}" cx="${x}" cy="${y}" r="5" class="${this.ui.selection === kind ? "is-selected" : ""}" tabindex="0" role="slider" aria-label="${copy("{kind} handle for point {index}", { kind: copy(kind === "in" ? "Incoming" : "Outgoing"), index: i + 1 })}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${p[0] * 100}" aria-valuetext="${this.pointValueText(p)}"/>`;
        }
      }
      return `<svg class="cv-graph" viewBox="0 0 400 248" role="group" aria-label="${copy("Editable time and value curve")}"><path class="cv-grid" d="M24 24V224H376M24 ${y0}H376M24 ${y1}H376M200 24V224"/><text x="7" y="${y0 + 4}">0</text><text x="2" y="${y1 + 4}">1</text><path class="cv-curve-path" d="${curvePath(c, { width: 400, height: 248, pad: 24, bounds: this.dragBounds || this.bounds })}"/><g class="cv-handles-drawing">${handles}</g><g class="cv-nodes">${c.nodes.map((n2, j) => {
        const [x, y] = this.coords(n2.t, n2.v);
        return `<circle data-cv-handle="point" data-cv-node="${j}" cx="${x}" cy="${y}" r="${j === i ? 5 : 3.5}" class="${j === i ? "is-selected" : ""}" tabindex="0" role="slider" aria-label="${copy("Point {index}", { index: j + 1 })}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${n2.t * 100}" aria-valuetext="${this.pointValueText([n2.t, n2.v], j === 0 || j === c.nodes.length - 1)}"/>`;
      }).join("")}</g><line class="cv-playhead" x1="24" x2="24" y1="24" y2="224"/><circle class="cv-graph-dot" cx="24" cy="${y0}" r="4"/></svg>`;
    }
    paint() {
      const c = this.current();
      if (!c || !this.root.querySelector(".cv-graph")) return;
      const graph = this.root.querySelector(".cv-graph");
      graph.querySelector(".cv-curve-path").setAttribute("d", curvePath(c, { width: 400, height: 248, pad: 24, bounds: this.dragBounds || this.bounds }));
      const i = this.ui.node, n = c.nodes[i];
      graph.querySelectorAll("[data-cv-handle]").forEach((el) => {
        const j = Number(el.dataset.cvNode), node2 = c.nodes[j];
        if (!node2) return;
        const kind = el.dataset.cvHandle, p = kind === "point" ? [node2.t, node2.v] : kind === "in" && j ? curveSegment(c.nodes[j - 1], node2)[2] : kind === "out" && j < c.nodes.length - 1 ? curveSegment(node2, c.nodes[j + 1])[1] : null;
        if (!p) return;
        const [x, y] = this.coords(...p);
        el.setAttribute("cx", x);
        el.setAttribute("cy", y);
        el.setAttribute("aria-valuenow", p[0] * 100);
        el.setAttribute("aria-valuetext", this.pointValueText(p, kind === "point" && (j === 0 || j === c.nodes.length - 1)));
        const line = graph.querySelector(`[data-cv-line="${kind}"]`);
        if (line) {
          const [nx, ny] = this.coords(node2.t, node2.v);
          line.setAttribute("x1", nx);
          line.setAttribute("y1", ny);
          line.setAttribute("x2", x);
          line.setAttribute("y2", y);
        }
      });
      for (const [key, val] of [["point-t", n.t], ["point-v", n.v], ...["in", "out"].flatMap((k) => {
        const p = k === "in" && i ? curveSegment(c.nodes[i - 1], n)[2] : k === "out" && i < c.nodes.length - 1 ? curveSegment(n, c.nodes[i + 1])[1] : null;
        return p ? [[k + "-t", p[0]], [k + "-v", p[1]]] : [];
      })]) {
        const el = this.root.querySelector(`[data-cv-field="${key}"]`);
        if (el && el !== document.activeElement) el.value = Number((val * 100).toFixed(6));
      }
      this.root.querySelector(`[data-cv-mini="${c.id}"]`)?.setAttribute("d", curvePath(c, { width: 140, height: 76, pad: 8 }));
      this.drawPreview();
      this.status();
    }
    pointValueText(p, locked = false) {
      return `${copy("Time {time}%, value {value}%", { time: +(p[0] * 100).toFixed(2), value: +(p[1] * 100).toFixed(2) })}${locked ? copy("; fixed endpoint") : copy("; Left/Right adjust time, Up/Down adjust value")}`;
    }
    status() {
      const el = this.root.querySelector(".cv-save-status");
      if (!el) return;
      el.textContent = this.root.querySelector('[aria-invalid="true"]') ? copy("Check input") : this.drag ? copy("Editing curve…") : { loading: copy("Loading…"), saved: copy("Saved"), saving: copy("Saving…"), unsaved: copy("Unsaved changes"), error: copy("Save unavailable"), conflict: copy("Save conflict") }[this.store.status];
      this.root.querySelector('[data-cv-action="undo"]').hidden = !this.store.undoEntry;
      this.root.querySelector('[data-cv-action="retry"]').hidden = this.store.status !== "error";
      this.root.querySelector('[data-cv-action="reload"]').hidden = this.store.status !== "conflict";
      if (this.store.error) this.message(this.store.error);
    }
    usage() {
      const el = this.root.querySelector("[data-cv-usage]");
      if (el) el.textContent = assetSummary().motion;
    }
    drawPreview() {
      const c = this.current(), graph = this.root.querySelector(".cv-graph");
      if (!c || !graph) return;
      const t2 = this.ui.playhead, v = evaluateCurve(c, t2), [x, y] = this.coords(t2, v), dot = graph.querySelector(".cv-graph-dot");
      dot.setAttribute("cx", x);
      dot.setAttribute("cy", y);
      const line = graph.querySelector(".cv-playhead");
      line.setAttribute("x1", x);
      line.setAttribute("x2", x);
      const b = this.dragBounds || this.bounds, map = (value2) => clamp2((value2 - b.min) / (b.max - b.min)) * 100;
      this.root.querySelector(".cv-demo-dot").style.left = map(v) + "%";
      const rail = this.root.querySelector(".cv-demo-rail");
      rail.style.left = map(0) + "%";
      rail.style.width = map(1) - map(0) + "%";
      this.root.querySelector(".cv-preview-value").textContent = Math.round(v * 100) + "%";
      const slider = this.root.querySelector('[data-cv-field="playhead"]');
      if (slider !== document.activeElement) slider.value = t2 * 1e3;
    }
    play() {
      if (this.disposed) return;
      if (this.playing) {
        this.stop();
        return;
      }
      const curveId = this.current()?.id;
      if (!curveId) return;
      const epoch = ++this.playEpoch;
      this.playing = true;
      if (this.ui.playhead >= 1) this.ui.playhead = 0;
      this.last = performance.now();
      const button2 = this.root.querySelector('[data-cv-action="play"]');
      if (button2) button2.textContent = copy("Pause");
      const tick2 = (now) => {
        if (this.disposed || epoch !== this.playEpoch || !this.playing) return;
        this.frame = null;
        const c = this.current();
        if (c?.id !== curveId) {
          this.stop(true);
          return;
        }
        this.ui.playhead = clamp2(this.ui.playhead + (now - this.last) / c.durationMs);
        this.last = now;
        this.drawPreview();
        if (this.ui.playhead >= 1 || document.hidden) this.stop();
        else this.frame = requestAnimationFrame(tick2);
      };
      if (typeof requestAnimationFrame === "function") this.frame = requestAnimationFrame(tick2);
    }
    stop(reset = false) {
      this.playEpoch++;
      this.playing = false;
      if (this.frame !== null) cancelAnimationFrame(this.frame);
      this.frame = null;
      if (reset) this.ui.playhead = 0;
      const b = this.root.querySelector('[data-cv-action="play"]');
      if (b) b.textContent = copy("Replay");
    }
    click(e) {
      const button2 = e.target.closest("[data-cv-action]");
      if (!button2 || button2.disabled) return;
      const action = button2.dataset.cvAction, c = this.current();
      if (action === "select-element") {
        this.ui.selection = button2.dataset.element;
        this.render();
        this.root.querySelector('[data-element="' + this.ui.selection + '"]')?.focus({ preventScroll: true });
        return;
      }
      if (action === "structure") {
        const details = this.root.querySelector(".cv-advanced");
        details.open = true;
        details.querySelector("[data-cv-field=interpolation]")._coreSelectComponent?.trigger.focus();
        return;
      }
      if (action === "parameters") {
        const area = this.root.querySelector(".cv-parameter-area");
        area.scrollIntoView({ block: "start" });
        area.querySelector("header").focus({ preventScroll: true });
        return;
      }
      if (action === "graph") {
        const handle = this.root.querySelector(`[data-cv-handle="${this.ui.selection || "point"}"][data-cv-node="${this.ui.node}"]`);
        handle?.scrollIntoView({ block: "center" });
        handle?.focus({ preventScroll: true });
        return;
      }
      if (action === "open") {
        this.stop();
        this.ui.curveId = button2.dataset.id;
        this.ui.node = 0;
        this.ui.selection = "point";
        this.ui.page = "curve";
        this.ui.playhead = 0;
        this.render();
        this.root.querySelector('[data-cv-field="name"]')?.focus({ preventScroll: true });
        return;
      }
      if (action === "back") {
        this.ui.page = "library";
        this.stop();
        this.render();
        (this.root.querySelector(`[data-cv-action="open"][data-id="${c?.id}"]`) || this.root.querySelector('[data-cv-field="search"]'))?.focus({ preventScroll: true });
        return;
      }
      if (action === "groups") {
        this.ui.groups = !this.ui.groups;
        this.render();
        return;
      }
      if (action === "clear") {
        this.ui.query = "";
        this.ui.group = "all";
        this.render();
        return;
      }
      if (action === "new") {
        this.stop(true);
        const n = bezierCurve(copy("Untitled curve"));
        n.groupId = this.store.data.groups.some((g) => g.id === this.ui.group) ? this.ui.group : null;
        this.ui.curveId = n.id;
        this.ui.page = "curve";
        this.ui.node = 0;
        this.mutate((d) => d.curves.unshift(n));
        this.root.querySelector('[data-cv-field="name"]')?.select();
        return;
      }
      if (action === "duplicate" && c) {
        this.stop(true);
        const n = duplicateCurve(c);
        this.ui.curveId = n.id;
        this.mutate((d) => d.curves.splice(d.curves.findIndex((x) => x.id === c.id) + 1, 0, n));
        return;
      }
      if (action === "delete" && c) {
        this.stop(true);
        this.mutate((d) => d.curves = d.curves.filter((x) => x.id !== c.id), { undo: "Delete curve" });
        return;
      }
      if (action === "add-group") {
        const input = this.root.querySelector('[data-cv-field="new-group"]'), name2 = input.value.trim();
        if (!name2) {
          input.focus();
          return;
        }
        this.mutate((d) => d.groups.push({ id: uid(), name: name2 }));
        return;
      }
      if (action === "delete-group") {
        this.ui.group = "all";
        this.mutate((d) => {
          d.groups = d.groups.filter((g) => g.id !== button2.dataset.id);
          d.curves.forEach((c2) => {
            if (c2.groupId === button2.dataset.id) c2.groupId = null;
          });
        }, { undo: "Delete group" });
        return;
      }
      if (action === "play") {
        this.play();
        return;
      }
      if (action === "add-point") {
        this.edit((c2) => {
          const n = splitCurve(c2, this.ui.node);
          this.ui.node = c2.nodes.indexOf(n);
        }, "render", "Split segment");
        return;
      }
      if (action === "remove-point") {
        this.edit((c2) => {
          removeCurvePoint(c2, this.ui.node);
          this.ui.node--;
        }, "render", "Remove point");
        return;
      }
      if (action === "reverse") {
        this.edit(reverseCurve, "render", "Reverse curve");
        return;
      }
      if (action === "flat") {
        this.edit((c2) => {
          const i = this.ui.node, n = c2.nodes[i];
          if (i) {
            n.in = [n.t - (n.t - c2.nodes[i - 1].t) / 3, n.v];
            c2.nodes[i - 1].interpolation = "bezier";
          }
          if (i < c2.nodes.length - 1) {
            n.out = [n.t + (c2.nodes[i + 1].t - n.t) / 3, n.v];
            n.interpolation = "bezier";
          }
        }, "render", "Flatten tangents");
        return;
      }
      if (action === "undo") {
        this.store.undo();
        return;
      }
      if (action === "retry") {
        this.store.flush();
        return;
      }
      if (action === "reload") {
        this.store.reload();
        return;
      }
      if (action === "use" || action === "default-motion") {
        try {
          useCurve(action === "use" ? c.id : null, action === "use" ? c.durationMs : 400);
          this.message(action === "use" ? "This curve now drives plugin motion." : "Default spring restored.");
        } catch (error) {
          this.message(error.message);
        }
        return;
      }
      if (action === "export-library") {
        this.download(this.store.data, "lomond-curves.json");
        return;
      }
      if (action === "export-curve") {
        this.download({ schema: "lomond.curve-export/1", curve: clone2(c) }, "lomond-curve.json");
        return;
      }
      if (action === "export-ae") {
        try {
          const plan = curveToAE(c, { duration: c.durationMs / 1e3, startValue: this.ui.aeStart ?? 0, endValue: this.ui.aeEnd ?? 100 });
          this.download({ curve: clone2(c), ...plan }, "lomond-ae-curve.json");
          this.message(plan.mode === "mixed-sampled" ? "Exported keyframes; very short handles use sampled segments." : "Exported temporal keyframe data.");
        } catch (error) {
          this.message(error.message);
        }
        return;
      }
      if (action === "import") {
        this.root.querySelector("[data-cv-import]").click();
      }
    }
    input(e) {
      const el = e.target, key = el.dataset.cvField;
      if (key === "search") {
        this.ui.query = el.value;
        this.render();
        return;
      }
      if (key === "playhead") {
        this.stop();
        this.ui.playhead = Number(el.value) / 1e3;
        this.drawPreview();
        return;
      }
      if (isNumber(el)) this.field(el, false);
    }
    change(e) {
      const el = e.target;
      if (el.hasAttribute("data-cv-import")) {
        this.importFile(el.files[0]);
        return;
      }
      if (el.dataset.cvGroup) {
        this.mutate((d) => d.groups.find((g) => g.id === el.dataset.cvGroup).name = el.value.trim());
        return;
      }
      if (el.dataset.cvField) this.field(el, true);
    }
    focusout(e) {
      if (e.target.getAttribute("aria-invalid") === "true") this.field(e.target, true);
    }
    numericValue(key) {
      const c = this.current(), n = c?.nodes[this.ui.node];
      if (key === "duration") return c?.durationMs;
      if (key === "ae-start" || key === "ae-end") return this.ui[key === "ae-start" ? "aeStart" : "aeEnd"] ?? (key === "ae-start" ? 0 : 100);
      if (key === "point-t") return n.t * 100;
      if (key === "point-v") return n.v * 100;
      if (/^(in|out)-(t|v)$/.test(key)) {
        const [kind, axis] = key.split("-"), p = kind === "in" ? curveSegment(c.nodes[this.ui.node - 1], n)[2] : curveSegment(n, c.nodes[this.ui.node + 1])[1];
        return p[axis === "t" ? 0 : 1] * 100;
      }
    }
    validateNumber(el, commit) {
      const value2 = el.value, n = Number(value2), min = el.getAttribute?.("min"), max = el.getAttribute?.("max"), invalid = value2 === "" || !Number.isFinite(n) || el.validity?.valid === false || min != null && n < Number(min) || max != null && n > Number(max);
      if (!invalid) {
        el.removeAttribute?.("aria-invalid");
        if (this.fieldErrorKey === el.dataset.cvField) {
          this.fieldErrorKey = null;
          this.message("");
        }
        this.status();
        return true;
      }
      this.fieldErrorKey = el.dataset.cvField;
      el.setAttribute?.("aria-invalid", "true");
      el.setAttribute?.("aria-describedby", this.noticeId);
      const rule = min != null && max != null ? copy("Enter a value from {min} to {max}, using the field step.", { min, max }) : copy("Enter a valid number.");
      if (commit) {
        el.value = String(this.numericValue(el.dataset.cvField));
        el.removeAttribute?.("aria-invalid");
        this.message(rule + copy(" Previous value restored."), true);
      } else this.message(rule + copy(" This edit has not been applied."), true);
      this.status();
      return false;
    }
    field(el, commit) {
      const key = el.dataset.cvField, value2 = el.value, number = Number(value2), c = this.current();
      if (isNumber(el) && !this.validateNumber(el, commit)) return;
      if (key === "search" || key === "new-group" || key === "playhead") return;
      if (key === "group-filter") {
        this.ui.group = value2;
        this.render();
        return;
      }
      if (key === "node") {
        this.ui.node = number;
        this.ui.selection = "point";
        this.render();
        return;
      }
      if (key === "ae-start" || key === "ae-end") {
        this.ui[key === "ae-start" ? "aeStart" : "aeEnd"] = number;
        return;
      }
      if (!c) return;
      if (key === "name") {
        this.edit((c2) => c2.name = value2.trim(), "render");
        return;
      }
      if (key === "curve-group") {
        this.edit((c2) => c2.groupId = value2 === "none" ? null : value2, "render");
        return;
      }
      if (key === "duration") {
        this.edit((c2) => c2.durationMs = number);
        return;
      }
      if (key === "interpolation") {
        this.edit((c2) => c2.nodes[this.ui.node].interpolation = value2, "render", "Change interpolation");
        return;
      }
      this.edit((c2) => {
        const i = this.ui.node, n = c2.nodes[i];
        if (key === "point-t" || key === "point-v") moveCurvePoint(c2, i, key === "point-t" ? number / 100 : n.t, key === "point-v" ? number / 100 : n.v);
        else if (/^(in|out)-(t|v)$/.test(key)) {
          const [kind, axis] = key.split("-"), p = kind === "in" ? curveSegment(c2.nodes[i - 1], n)[2] : curveSegment(n, c2.nodes[i + 1])[1];
          p[axis === "t" ? 0 : 1] = axis === "t" ? clamp2(number / 100, kind === "in" ? c2.nodes[i - 1].t : n.t, kind === "in" ? n.t : c2.nodes[i + 1].t) : number / 100;
          n[kind] = p;
        }
      }, "curve-paint");
      if (commit) this.render();
    }
    storeUpdate(kind) {
      if (this.drag) {
        const c = this.store.data?.curves.find((c2) => c2.id === this.drag.base.id);
        if (!c || JSON.stringify(c) !== this.drag.signature) {
          this.endDrag(false);
          this.message(copy("This curve changed elsewhere. Your drag was cancelled."), true);
        } else this.status();
        return;
      }
      if (kind === "status") this.status();
      else if (kind === "curve-paint") this.paint();
      else this.render();
    }
    flushDrag() {
      const d = this.drag;
      if (!d || !d.pending) return;
      const { t: t2, v } = d.pending;
      d.pending = null;
      const c = d.draft, n = c.nodes[d.index];
      if (d.kind === "point") moveCurvePoint(c, d.index, t2, v);
      else n[d.kind] = [clamp2(t2, d.kind === "in" ? c.nodes[d.index - 1].t : n.t, d.kind === "in" ? n.t : c.nodes[d.index + 1].t), clamp2(v, -4, 5)];
      this.paint();
    }
    endDrag(commit, render = true) {
      const d = this.drag;
      if (!d) return;
      if (d.frame !== null) cancelAnimationFrame(d.frame);
      if (commit) this.flushDrag();
      d.events.abort();
      this.drag = null;
      if (d.target.hasPointerCapture?.(d.pointerId)) d.target.releasePointerCapture(d.pointerId);
      this.dragBounds = null;
      if (commit && JSON.stringify(d.draft) !== d.signature) this.mutate((data) => {
        const i = data.curves.findIndex((c) => c.id === d.base.id);
        if (i < 0 || JSON.stringify(data.curves[i]) !== d.signature) throw new Error(copy("This curve changed elsewhere. Reopen it before editing."));
        data.curves[i] = d.draft;
      }, { kind: "curve-paint", undo: "Move curve point" });
      if (render) {
        this.render();
        this.root.querySelector(`[data-cv-handle="${d.kind}"][data-cv-node="${d.index}"]`)?.focus({ preventScroll: true });
      }
    }
    pointerdown(e) {
      const point = e.target.closest("[data-cv-handle]");
      if (!point || e.button !== 0) return;
      e.preventDefault();
      this.endDrag(false);
      this.stop();
      const index = Number(point.dataset.cvNode), kind = point.dataset.cvHandle;
      this.ui.node = index;
      this.ui.selection = kind;
      this.render();
      this.dragBounds = { ...this.bounds };
      const target = this.root.querySelector(`[data-cv-handle="${kind}"][data-cv-node="${index}"]`), rect = viewportRect(this.root.querySelector(".cv-graph")), base = clone2(this.current()), events = new AbortController();
      this.drag = { target, pointerId: e.pointerId, base, draft: clone2(base), signature: JSON.stringify(base), index, kind, events, frame: null, pending: null };
      target.focus({ preventScroll: true });
      target.setPointerCapture?.(e.pointerId);
      this.status();
      const move = (ev) => {
        const d = this.drag;
        if (!d || ev.pointerId !== e.pointerId || !rect.width || !rect.height) return;
        const x = (ev.clientX - rect.left) / rect.width * 400, y = (ev.clientY - rect.top) / rect.height * 248;
        d.pending = { t: (x - 24) / 352, v: this.dragBounds.max - (y - 24) / 200 * (this.dragBounds.max - this.dragBounds.min) };
        if (d.frame === null) d.frame = requestAnimationFrame(() => {
          if (this.drag !== d) return;
          d.frame = null;
          this.flushDrag();
        });
      };
      const end = (ev) => {
        if (ev.pointerId === e.pointerId) {
          if (ev.type === "pointerup") move(ev);
          this.endDrag(ev.type === "pointerup");
        }
      };
      target.addEventListener("pointermove", move, { signal: events.signal });
      for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) target.addEventListener(type, end, { signal: events.signal });
    }
    keydown(e) {
      if (e.target.dataset.cvField === "new-group" && e.key === "Enter") {
        e.preventDefault();
        this.root.querySelector('[data-cv-action="add-group"]').click();
        return;
      }
      const el = e.target.closest("[data-cv-handle]");
      if (!el || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Enter"].includes(e.key)) return;
      e.preventDefault();
      const i = Number(el.dataset.cvNode), kind = el.dataset.cvHandle;
      this.ui.node = i;
      this.ui.selection = kind;
      this.render();
      this.root.querySelector(`[data-cv-handle="${kind}"][data-cv-node="${i}"]`)?.focus({ preventScroll: true });
      if (e.key === "Enter") return;
      const dx = (e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0) * (e.shiftKey ? 0.05 : 5e-3), dy = (e.key === "ArrowUp" ? 1 : e.key === "ArrowDown" ? -1 : 0) * (e.shiftKey ? 0.05 : 5e-3);
      this.edit((c) => {
        const n = c.nodes[i];
        if (kind === "point") moveCurvePoint(c, i, n.t + dx, n.v + dy);
        else {
          const p = kind === "in" ? curveSegment(c.nodes[i - 1], n)[2] : curveSegment(n, c.nodes[i + 1])[1];
          n[kind] = [clamp2(p[0] + dx, kind === "in" ? c.nodes[i - 1].t : n.t, kind === "in" ? n.t : c.nodes[i + 1].t), clamp2(p[1] + dy, -4, 5)];
        }
      });
    }
    download(data, name2) {
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })), a = document.createElement("a");
      a.href = url;
      a.download = name2;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1e3);
    }
    async importFile(file) {
      if (!file) return;
      try {
        if (file.size > 2e6) throw new Error("Choose a file smaller than 2 MB.");
        const parsed = JSON.parse(await file.text()), data = parsed.schema === "lomond.curve-export/1" ? { schemaVersion: 1, groups: [], curves: [{ ...parsed.curve, groupId: null }] } : parsed;
        validateCurveLibrary(data);
        const imported = this.mutate((d) => {
          const groups = /* @__PURE__ */ new Map();
          for (const g of data.groups) {
            let existing = d.groups.find((x) => x.name.toLowerCase() === g.name.toLowerCase());
            if (!existing) {
              existing = { id: uid(), name: g.name };
              d.groups.push(existing);
            }
            groups.set(g.id, existing.id);
          }
          for (const c of data.curves) {
            const copy3 = duplicateCurve(c);
            copy3.name = c.name;
            copy3.groupId = c.groupId ? groups.get(c.groupId) : null;
            d.curves.push(copy3);
          }
        }, { undo: copy("Import curves") });
        if (imported) this.message(copy("Curves imported."));
      } catch (error) {
        this.message(error.message);
      }
    }
    destroy() {
      this.disposed = true;
      disposeControls(this.root);
      this.endDrag(false, false);
      this.stop();
      this.abort.abort();
      this.unsubscribe();
      this.unobserve();
    }
  };

  // client/reference/src/assets.js
  var ReferencePalette = class extends PaletteView {
    constructor(root2, snapshot) {
      super(root2, snapshot);
      this.numericDrafts = /* @__PURE__ */ new WeakMap();
      window.addEventListener("blur", () => this.endStop(false), { signal: this.abort.signal });
      root2.addEventListener("focusin", (e) => {
        if (isNumber(e.target)) this.numericDrafts.set(e.target, e.target.value);
      }, { signal: this.abort.signal });
      root2.addEventListener("focusout", (e) => {
        if (e.target.getAttribute("aria-invalid") === "true" && root2.contains(e.target)) this.change(e);
      }, { signal: this.abort.signal });
    }
    input(e) {
      const el = e.target;
      if (isNumber(el) && (!el.value || !el.validity.valid)) {
        el.setAttribute("aria-invalid", "true");
        return;
      }
      super.input(e);
      if (isNumber(el)) {
        el.removeAttribute("aria-invalid");
        this.numericDrafts.set(el, el.value);
      }
    }
    change(e) {
      const el = e.target;
      if (isNumber(el)) {
        const next = normalizeField({ type: "number", min: el.min === "" ? void 0 : Number(el.min), max: el.max === "" ? void 0 : Number(el.max), step: Number(el.step) || 1 }, el.value);
        el.value = next ?? this.numericDrafts.get(el) ?? 0;
        el.removeAttribute("aria-invalid");
      }
      super.change(e);
    }
    dragStop(e) {
      const handle = e.target.closest("[data-stop]");
      if (!handle || e.button !== 0) return;
      e.preventDefault();
      this.endStop(false);
      this.ui.stopId = handle.dataset.stop;
      this.render();
      const target = this.root.querySelector(`[data-stop="${this.ui.stopId}"]`), track = target.closest(".pal-stop-track"), { p, s } = this.current(), draft = clone2(s.paint), events = new AbortController();
      const drag = { target, track, pointer: e.pointerId, palette: p.id, slot: s.id, stop: this.ui.stopId, channel: this.ui.channel === "color" ? "colorStops" : "opacityStops", draft, events, frame: null, pending: null };
      this.stopDrag = drag;
      target.focus({ preventScroll: true });
      target.setPointerCapture(e.pointerId);
      const sample = (ev) => {
        const rect = viewportRect(track);
        drag.pending = Math.round(clamp2((ev.clientX - rect.left) / rect.width) * 1e3) / 1e3;
        if (drag.frame === null) drag.frame = requestAnimationFrame(() => this.flushStop());
      };
      target.addEventListener("pointermove", (ev) => {
        if (ev.pointerId === drag.pointer) sample(ev);
      }, { signal: events.signal });
      for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) target.addEventListener(type, (ev) => {
        if (ev.pointerId === drag.pointer) {
          if (type === "pointerup") sample(ev);
          this.endStop(type === "pointerup");
        }
      }, { signal: events.signal });
    }
    flushStop() {
      const d = this.stopDrag;
      if (!d) return;
      if (d.frame !== null) cancelAnimationFrame(d.frame);
      d.frame = null;
      if (d.pending === null) return;
      d.draft[d.channel].find((s) => s.id === d.stop).offset = d.pending;
      d.target.style.left = d.pending * 100 + "%";
      d.target.setAttribute("aria-valuenow", String(d.pending * 100));
      this.root.querySelectorAll(`[data-paint="${d.slot}"]`).forEach((img) => img.src = paintURL(d.draft, Number(img.dataset.w), Number(img.dataset.h), !!img.dataset.ramp));
      d.pending = null;
    }
    endStop(commit) {
      const d = this.stopDrag;
      if (!d) return;
      if (commit) this.flushStop();
      if (d.frame !== null) cancelAnimationFrame(d.frame);
      d.events.abort();
      this.stopDrag = null;
      if (d.target.hasPointerCapture?.(d.pointer)) d.target.releasePointerCapture(d.pointer);
      if (commit) this.store.change((data) => {
        data.palettes.find((p) => p.id === d.palette).slots.find((s) => s.id === d.slot).paint = d.draft;
      }, { kind: "paint", undo: "Move gradient stop" });
      else this.paint();
    }
    keydown(e) {
      if (e.key === "Escape" && this.stopDrag) {
        e.preventDefault();
        e.stopPropagation();
        this.endStop(false);
        return;
      }
      if (e.key === "Enter" && !e.isComposing && isNumber(e.target)) {
        e.preventDefault();
        this.change(e);
        return;
      }
      super.keydown(e);
    }
    render() {
      this.endStop(false);
      super.render();
    }
    click(e) {
      const action = e.target.closest("[data-pal-action]")?.dataset.palAction;
      if (["export", "export-paint", "import"].includes(action)) {
        this.message(bilingual("Fixture library only. Import/export does not access production assets.", "仅使用模拟库；本参考页不导入或导出生产资产。"));
        return;
      }
      super.click(e);
    }
    get dirty() {
      return this.store.dirty || assetSettingsStore().dirty || !!this.picker || !!this.stopDrag || !!this.root.querySelector("[aria-invalid=true]");
    }
    save() {
      return this.store.flush().fixtureSaved && assetSettingsStore().flush().fixtureSaved;
    }
    discard() {
      this.endStop(false);
      this.closePicker(false, { animate: false });
      this.store.reload();
      assetSettingsStore().reload();
    }
    destroy() {
      this.endStop(false);
      super.destroy();
    }
  };
  var ReferenceCurve = class extends CurveView {
    constructor(root2, snapshot) {
      super(root2, snapshot);
      window.addEventListener("blur", () => {
        this.endDrag(false);
        this.stop();
      }, { signal: this.abort.signal });
    }
    keydown(e) {
      if (e.key === "Escape" && this.drag) {
        e.preventDefault();
        e.stopPropagation();
        this.endDrag(false);
        return;
      }
      super.keydown(e);
    }
    click(e) {
      const action = e.target.closest("[data-cv-action]")?.dataset.cvAction;
      if (["export-ae", "export-curve", "export-library", "import"].includes(action)) {
        this.message(bilingual("Fixture only; no AE execution or production asset transfer.", "仅模拟数据，不执行 AE 操作或迁移生产资产。"));
        return;
      }
      super.click(e);
    }
    get dirty() {
      return this.store.dirty || assetSettingsStore().dirty || !!this.drag || !!this.root.querySelector("[aria-invalid=true]");
    }
    save() {
      return this.store.flush().fixtureSaved && assetSettingsStore().flush().fixtureSaved;
    }
    discard() {
      this.endDrag(false);
      this.store.reload();
      assetSettingsStore().reload();
    }
  };

  // client/reference/src/icons.js
  var icons = { registry: '<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="10" cy="18" r="2"/>', curves: '<path d="M3 20C14 20 9 4 21 4M3 20V4m0 16h18"/><circle cx="3" cy="20" r="1.5"/><circle cx="21" cy="4" r="1.5"/>', palette: '<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><path d="M17 13v8m-4-4h8"/>', vela: '<path d="m4 4 8 16L20 4M12 20V4"/>', plus: '<path d="M12 5v14M5 12h14"/>', send: '<path d="M12 19V5m-6 6 6-6 6 6"/>', comp: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M8 5v14M16 5v14"/>', selection: '<path d="M5 3v16l4-5 4 7 3-2-4-6h7Z"/>', text: '<path d="M5 5h14M12 5v14m-4 0h8M5 5v3m14-3v3"/>', shape: '<rect x="5" y="5" width="14" height="14" rx="2"/>', kit: '<rect x="3" y="4" width="7" height="16" rx="1"/><rect x="14" y="4" width="7" height="7" rx="1"/><rect x="14" y="15" width="7" height="5" rx="1"/>', settings: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2"/><circle cx="15" cy="17" r="2"/>', grip: '<path d="m7 19 12-12m-6 12 6-6"/>', check: '<path d="m5 12 4 4L19 6"/>', stop: '<rect x="6" y="6" width="12" height="12" rx="1"/>', loader: '<path d="M20 12a8 8 0 1 1-8-8"/>', close: '<path d="m6 6 12 12M6 18 18 6"/>' };
  function icon2(name2, extra = "") {
    if (!icons[name2]) throw new Error("Unknown Lab icon: " + name2);
    return `<svg class="icon ${extra}" data-lab-icon="${name2}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name2]}</svg>`;
  }

  // client/reference/src/vela.js
  var import_velaPresentationModel = __toESM(require_velaPresentationModel(), 1);

  // client/reference/src/vela-fixtures.json
  var vela_fixtures_default = {
    review: {
      provider: {
        state: "pending",
        text: null,
        errorCode: null
      },
      confirmation: {
        state: "confirmation-ready",
        reviewId: "agent_review_1_1_logical_0_attempt_0",
        revision: 1,
        target: {
          compId: "ae-project-1-item-1",
          layerId: "ae-project-1-item-1-layer-2"
        },
        approvalScope: "current-step",
        stepNumber: 1,
        stepCount: 2,
        canApprove: true,
        capabilityId: "set-opacity-v1",
        valueKind: "number",
        beforeValue: 20,
        proposedValue: 60,
        errorCode: null,
        moduleRevision: "vela-objective-review-surface-v1"
      },
      driver: {
        state: "awaiting-review",
        committed: false,
        objectiveId: "objective_agent_1",
        taskId: "agent_task_1",
        taskPlan: {
          contractType: "task-plan",
          planId: "task_plan_agent_1_logical_0_attempt_0",
          taskId: "agent_task_1",
          revision: 0,
          steps: [
            {
              stepId: "operate_opacity_1_logical_0_attempt_0",
              kind: "operate",
              capabilityIntent: {
                contractType: "capability-intent",
                intentId: "intent_agent_1_logical_0_attempt_0",
                capabilityId: "set-opacity-v1",
                requestedOperation: "mutate",
                params: {
                  opacity: 60
                }
              },
              rationale: "Apply the bounded single-step mutation objective.",
              metadata: {
                expectedValue: {
                  kind: "number",
                  data: 60
                }
              }
            }
          ]
        },
        turn: {
          sessionId: "session_1",
          turnId: "turn_1"
        },
        logicalPlan: {
          logicalPlanId: "logical_plan_agent_1",
          planSemanticSignature: '{"declaredStepCount":2,"stepSemanticSignatures":["{\\"capabilityId\\":\\"set-opacity-v1\\",\\"params\\":{\\"opacity\\":60},\\"targetScopeKind\\":\\"selected-layer\\"}","{\\"capabilityId\\":\\"set-layer-name-v1\\",\\"params\\":{\\"name\\":\\"Vela Stream Test\\"},\\"targetScopeKind\\":\\"selected-layer\\"}"]}',
          currentStepIndex: 0,
          stepCount: 2,
          currentStepId: "logical_step_agent_1_0",
          materializedTaskPlanId: "task_plan_agent_1_logical_0_attempt_0",
          materializedStepId: "operate_opacity_1_logical_0_attempt_0",
          completedStepCount: 0,
          remainingStepCount: 2,
          partialCompletion: false,
          status: "materialized"
        },
        suspendedReview: {
          objectiveId: "objective_agent_1",
          taskId: "agent_task_1",
          sessionId: "session_1",
          turnId: "turn_1",
          taskPlanId: "task_plan_agent_1_logical_0_attempt_0",
          taskPlanRevision: 0,
          stepId: "operate_opacity_1_logical_0_attempt_0",
          capabilityId: "set-opacity-v1",
          params: {
            opacity: 60
          },
          localExpectation: {
            opacity: 60
          },
          beforeValue: 20,
          reviewId: "agent_review_1_1_logical_0_attempt_0",
          revision: 1,
          reviewCorrelation: "req_00000000000000000000000000000008",
          reviewTarget: {
            compId: "ae-project-1-item-1",
            layerId: "ae-project-1-item-1-layer-2",
            revision: 1
          }
        },
        reviewResolution: null,
        terminal: null,
        counters: {
          observations: 1,
          reasoningTurns: 1,
          actions: 1,
          replans: 0
        },
        loop: {
          iterationIndex: 0,
          budgets: {
            iterationsUsed: 1,
            providerCallsUsed: 1,
            actionAttemptsUsed: 0
          },
          noProgressCount: 0
        },
        disposed: false
      },
      reviews: [
        {
          state: "confirmation-ready",
          reviewId: "agent_review_1_1_logical_0_attempt_0",
          revision: 1,
          target: {
            compId: "ae-project-1-item-1",
            layerId: "ae-project-1-item-1-layer-2"
          },
          approvalScope: "current-step",
          stepNumber: 1,
          stepCount: 2,
          canApprove: true,
          capabilityId: "set-opacity-v1",
          valueKind: "number",
          beforeValue: 20,
          proposedValue: 60,
          errorCode: null,
          moduleRevision: "vela-objective-review-surface-v1"
        }
      ],
      trajectory: {
        active: {
          schema: "vela.verified-trajectory-evidence.v1",
          authorityCapable: false,
          projectionId: "trajectory_projection_5",
          supersedesProjectionId: "trajectory_projection_4",
          objective: {
            sessionId: "session_1",
            objectiveId: "objective_agent_1",
            taskId: "agent_task_1",
            logicalPlanId: "logical_plan_agent_1"
          },
          lifecycle: {
            state: "active",
            lateEvidence: false
          },
          attempts: [
            {
              attemptId: "trajectory_attempt_3",
              correlation: {
                taskPlanId: "task_plan_agent_1_logical_0_attempt_0",
                taskPlanRevision: 0,
                materializedStepId: "operate_opacity_1_logical_0_attempt_0",
                intentId: "intent_agent_1_logical_0_attempt_0",
                logicalStepId: "logical_step_agent_1_0",
                logicalStepIndex: 0,
                materializationAttempt: 0,
                turnId: "turn_1",
                taskRunId: null,
                authorizedPlanId: null,
                executionPlanId: null,
                actionIndex: null,
                providerRequestId: null,
                supersedesAttemptId: null
              },
              capabilityId: "set-opacity-v1",
              target: {
                targetRef: null,
                targetKind: "property"
              },
              intent: {
                submitted: true,
                admitted: true,
                review: "pending"
              },
              execution: {
                executionAttempted: null,
                hostInvocationAttempted: null,
                mutationDisposition: "unknown",
                reportedCommitted: null,
                hostCommitted: null,
                resultCode: null,
                resultingValueDigest: null
              },
              verification: {
                attemptId: null,
                sourceObservationId: null,
                attempted: null,
                disposition: "unknown",
                scope: "unknown",
                targetRelation: "unproven",
                freshAtRead: null,
                matches: null,
                expected: {
                  kind: "number",
                  data: 60
                },
                actual: null,
                actualDigest: null,
                code: null
              },
              completion: {
                outcome: "active",
                superseded: false
              },
              provenance: [
                {
                  factPaths: [
                    "correlation",
                    "capabilityId",
                    "intent.submitted",
                    "verification.expected"
                  ],
                  class: "local-control-occurrence",
                  producer: "VelaAgentDriver",
                  contractRevision: "vela-trajectory-source-v1",
                  occurrenceId: "trajectory_occurrence_2",
                  sourceRequestId: null,
                  sourceSessionSeq: null,
                  strength: "direct"
                },
                {
                  factPaths: [
                    "intent.admitted",
                    "intent.review"
                  ],
                  class: "local-control-occurrence",
                  producer: "VelaAgentDriver",
                  contractRevision: "vela-trajectory-source-v1",
                  occurrenceId: "trajectory_occurrence_3",
                  sourceRequestId: null,
                  sourceSessionSeq: null,
                  strength: "direct"
                }
              ],
              unknowns: [
                {
                  path: "correlation.providerRequestId",
                  reason: "not-wired"
                },
                {
                  path: "target.targetRef",
                  reason: "not-wired"
                },
                {
                  path: "correlation.taskRunId",
                  reason: "not-observed"
                },
                {
                  path: "correlation.authorizedPlanId",
                  reason: "not-observed"
                },
                {
                  path: "correlation.executionPlanId",
                  reason: "not-observed"
                },
                {
                  path: "correlation.actionIndex",
                  reason: "not-observed"
                },
                {
                  path: "correlation.supersedesAttemptId",
                  reason: "not-observed"
                },
                {
                  path: "execution.executionAttempted",
                  reason: "not-observed"
                },
                {
                  path: "execution.hostInvocationAttempted",
                  reason: "not-observed"
                },
                {
                  path: "execution.mutationDisposition",
                  reason: "not-observed"
                },
                {
                  path: "execution.reportedCommitted",
                  reason: "not-observed"
                },
                {
                  path: "execution.hostCommitted",
                  reason: "not-observed"
                },
                {
                  path: "execution.resultCode",
                  reason: "not-observed"
                },
                {
                  path: "execution.resultingValueDigest",
                  reason: "not-observed"
                },
                {
                  path: "verification.attemptId",
                  reason: "not-observed"
                },
                {
                  path: "verification.sourceObservationId",
                  reason: "not-observed"
                },
                {
                  path: "verification.attempted",
                  reason: "not-observed"
                },
                {
                  path: "verification.disposition",
                  reason: "not-observed"
                },
                {
                  path: "verification.scope",
                  reason: "not-observed"
                },
                {
                  path: "verification.freshAtRead",
                  reason: "not-observed"
                },
                {
                  path: "verification.matches",
                  reason: "not-observed"
                },
                {
                  path: "verification.actual",
                  reason: "not-observed"
                },
                {
                  path: "verification.actualDigest",
                  reason: "not-observed"
                },
                {
                  path: "verification.code",
                  reason: "not-observed"
                }
              ]
            }
          ],
          completion: {
            outcome: "active",
            code: null,
            coverage: "none",
            declaredStepCount: 2,
            completedStepCount: 0,
            remainingStepCount: 2,
            verifiedEvidenceStepCount: 0,
            sourceAttemptIds: [
              "trajectory_attempt_3"
            ]
          },
          provenance: [
            {
              factPaths: [
                "objective"
              ],
              class: "local-control-occurrence",
              producer: "VelaAgentDriver",
              contractRevision: "vela-trajectory-source-v1",
              occurrenceId: "trajectory_occurrence_1",
              sourceRequestId: null,
              sourceSessionSeq: null,
              strength: "direct"
            }
          ],
          unknowns: [
            {
              path: "completion.code",
              reason: "not-observed"
            }
          ],
          bounds: {
            complete: true,
            omittedAttemptCount: 0,
            omittedValueCount: 0
          }
        },
        terminal: null
      }
    },
    executing: {
      provider: {
        state: "pending",
        text: null,
        errorCode: null
      },
      confirmation: {
        state: "review-approved",
        beforeValue: null,
        proposedValue: null,
        errorCode: null,
        moduleRevision: "vela-objective-review-surface-v1"
      },
      driver: {
        state: "awaiting-outcome",
        committed: null,
        objectiveId: "objective_agent_1",
        taskId: "agent_task_1",
        taskPlan: {
          contractType: "task-plan",
          planId: "task_plan_agent_1_logical_0_attempt_0",
          taskId: "agent_task_1",
          revision: 0,
          steps: [
            {
              stepId: "operate_opacity_1_logical_0_attempt_0",
              kind: "operate",
              capabilityIntent: {
                contractType: "capability-intent",
                intentId: "intent_agent_1_logical_0_attempt_0",
                capabilityId: "set-opacity-v1",
                requestedOperation: "mutate",
                params: {
                  opacity: 60
                }
              },
              rationale: "Apply the bounded single-step mutation objective.",
              metadata: {
                expectedValue: {
                  kind: "number",
                  data: 60
                }
              }
            }
          ]
        },
        turn: {
          sessionId: "session_1",
          turnId: "turn_1"
        },
        logicalPlan: {
          logicalPlanId: "logical_plan_agent_1",
          planSemanticSignature: '{"declaredStepCount":2,"stepSemanticSignatures":["{\\"capabilityId\\":\\"set-opacity-v1\\",\\"params\\":{\\"opacity\\":60},\\"targetScopeKind\\":\\"selected-layer\\"}","{\\"capabilityId\\":\\"set-layer-name-v1\\",\\"params\\":{\\"name\\":\\"Vela Stream Test\\"},\\"targetScopeKind\\":\\"selected-layer\\"}"]}',
          currentStepIndex: 0,
          stepCount: 2,
          currentStepId: "logical_step_agent_1_0",
          materializedTaskPlanId: "task_plan_agent_1_logical_0_attempt_0",
          materializedStepId: "operate_opacity_1_logical_0_attempt_0",
          completedStepCount: 0,
          remainingStepCount: 2,
          partialCompletion: false,
          status: "materialized"
        },
        suspendedReview: null,
        reviewResolution: {
          reviewId: "agent_review_1_1_logical_0_attempt_0",
          revision: 1,
          outcome: "approved",
          objectiveId: "objective_agent_1",
          taskId: "agent_task_1",
          taskPlanId: "task_plan_agent_1_logical_0_attempt_0",
          stepId: "operate_opacity_1_logical_0_attempt_0"
        },
        terminal: null,
        counters: {
          observations: 1,
          reasoningTurns: 1,
          actions: 1,
          replans: 0
        },
        loop: {
          iterationIndex: 0,
          budgets: {
            iterationsUsed: 1,
            providerCallsUsed: 1,
            actionAttemptsUsed: 1
          },
          noProgressCount: 0
        },
        disposed: false
      },
      reviews: [
        {
          state: "confirmation-ready",
          reviewId: "agent_review_1_1_logical_0_attempt_0",
          revision: 1,
          target: {
            compId: "ae-project-1-item-1",
            layerId: "ae-project-1-item-1-layer-2"
          },
          approvalScope: "current-step",
          stepNumber: 1,
          stepCount: 2,
          canApprove: true,
          capabilityId: "set-opacity-v1",
          valueKind: "number",
          beforeValue: 20,
          proposedValue: 60,
          errorCode: null,
          moduleRevision: "vela-objective-review-surface-v1"
        }
      ],
      trajectory: {
        active: {
          schema: "vela.verified-trajectory-evidence.v1",
          authorityCapable: false,
          projectionId: "trajectory_projection_9",
          supersedesProjectionId: "trajectory_projection_8",
          objective: {
            sessionId: "session_1",
            objectiveId: "objective_agent_1",
            taskId: "agent_task_1",
            logicalPlanId: "logical_plan_agent_1"
          },
          lifecycle: {
            state: "active",
            lateEvidence: false
          },
          attempts: [
            {
              attemptId: "trajectory_attempt_3",
              correlation: {
                taskPlanId: "task_plan_agent_1_logical_0_attempt_0",
                taskPlanRevision: 0,
                materializedStepId: "operate_opacity_1_logical_0_attempt_0",
                intentId: "intent_agent_1_logical_0_attempt_0",
                logicalStepId: "logical_step_agent_1_0",
                logicalStepIndex: 0,
                materializationAttempt: 0,
                turnId: "turn_1",
                taskRunId: "task_run_1",
                authorizedPlanId: "confirmedPlan_3",
                executionPlanId: "plan_21c47f025144b6a32478126a53a03a8b6c8f90d5991294eb6ab31c5331d1e074",
                actionIndex: 0,
                providerRequestId: null,
                supersedesAttemptId: null
              },
              capabilityId: "set-opacity-v1",
              target: {
                targetRef: null,
                targetKind: "property"
              },
              intent: {
                submitted: true,
                admitted: true,
                review: "approved"
              },
              execution: {
                executionAttempted: true,
                hostInvocationAttempted: true,
                mutationDisposition: "unknown",
                reportedCommitted: null,
                hostCommitted: null,
                resultCode: null,
                resultingValueDigest: null
              },
              verification: {
                attemptId: null,
                sourceObservationId: null,
                attempted: null,
                disposition: "unknown",
                scope: "unknown",
                targetRelation: "unproven",
                freshAtRead: null,
                matches: null,
                expected: {
                  kind: "number",
                  data: 60
                },
                actual: null,
                actualDigest: null,
                code: null
              },
              completion: {
                outcome: "active",
                superseded: false
              },
              provenance: [
                {
                  factPaths: [
                    "correlation",
                    "capabilityId",
                    "intent.submitted",
                    "verification.expected"
                  ],
                  class: "local-control-occurrence",
                  producer: "VelaAgentDriver",
                  contractRevision: "vela-trajectory-source-v1",
                  occurrenceId: "trajectory_occurrence_2",
                  sourceRequestId: null,
                  sourceSessionSeq: null,
                  strength: "direct"
                },
                {
                  factPaths: [
                    "intent.admitted",
                    "intent.review"
                  ],
                  class: "local-control-occurrence",
                  producer: "VelaAgentDriver",
                  contractRevision: "vela-trajectory-source-v1",
                  occurrenceId: "trajectory_occurrence_3",
                  sourceRequestId: null,
                  sourceSessionSeq: null,
                  strength: "direct"
                },
                {
                  factPaths: [
                    "intent.admitted",
                    "intent.review"
                  ],
                  class: "local-control-occurrence",
                  producer: "VelaAgentDriver",
                  contractRevision: "vela-trajectory-source-v1",
                  occurrenceId: "trajectory_occurrence_4",
                  sourceRequestId: null,
                  sourceSessionSeq: null,
                  strength: "direct"
                },
                {
                  factPaths: [
                    "correlation.executionPlanId",
                    "correlation.authorizedPlanId",
                    "correlation.taskRunId",
                    "correlation.actionIndex"
                  ],
                  class: "local-control-occurrence",
                  producer: "VelaRuntime",
                  contractRevision: "vela-trajectory-source-v1",
                  occurrenceId: "trajectory_occurrence_5",
                  sourceRequestId: null,
                  sourceSessionSeq: null,
                  strength: "direct"
                },
                {
                  factPaths: [
                    "execution.executionAttempted"
                  ],
                  class: "execution-result",
                  producer: "VelaExecutionPreflight",
                  contractRevision: "vela-trajectory-source-v1",
                  occurrenceId: "trajectory_occurrence_6",
                  sourceRequestId: null,
                  sourceSessionSeq: null,
                  strength: "direct"
                },
                {
                  factPaths: [
                    "execution.hostInvocationAttempted"
                  ],
                  class: "execution-result",
                  producer: "VelaExecutionAdapter",
                  contractRevision: "vela-trajectory-source-v1",
                  occurrenceId: "trajectory_occurrence_7",
                  sourceRequestId: "req_00000000000000000000000000000024",
                  sourceSessionSeq: null,
                  strength: "direct"
                }
              ],
              unknowns: [
                {
                  path: "correlation.providerRequestId",
                  reason: "not-wired"
                },
                {
                  path: "target.targetRef",
                  reason: "not-wired"
                },
                {
                  path: "correlation.supersedesAttemptId",
                  reason: "not-observed"
                },
                {
                  path: "execution.mutationDisposition",
                  reason: "not-observed"
                },
                {
                  path: "execution.reportedCommitted",
                  reason: "not-observed"
                },
                {
                  path: "execution.hostCommitted",
                  reason: "not-observed"
                },
                {
                  path: "execution.resultCode",
                  reason: "not-observed"
                },
                {
                  path: "execution.resultingValueDigest",
                  reason: "not-observed"
                },
                {
                  path: "verification.attemptId",
                  reason: "not-observed"
                },
                {
                  path: "verification.sourceObservationId",
                  reason: "not-observed"
                },
                {
                  path: "verification.attempted",
                  reason: "not-observed"
                },
                {
                  path: "verification.disposition",
                  reason: "not-observed"
                },
                {
                  path: "verification.scope",
                  reason: "not-observed"
                },
                {
                  path: "verification.freshAtRead",
                  reason: "not-observed"
                },
                {
                  path: "verification.matches",
                  reason: "not-observed"
                },
                {
                  path: "verification.actual",
                  reason: "not-observed"
                },
                {
                  path: "verification.actualDigest",
                  reason: "not-observed"
                },
                {
                  path: "verification.code",
                  reason: "not-observed"
                }
              ]
            }
          ],
          completion: {
            outcome: "active",
            code: null,
            coverage: "none",
            declaredStepCount: 2,
            completedStepCount: 0,
            remainingStepCount: 2,
            verifiedEvidenceStepCount: 0,
            sourceAttemptIds: [
              "trajectory_attempt_3"
            ]
          },
          provenance: [
            {
              factPaths: [
                "objective"
              ],
              class: "local-control-occurrence",
              producer: "VelaAgentDriver",
              contractRevision: "vela-trajectory-source-v1",
              occurrenceId: "trajectory_occurrence_1",
              sourceRequestId: null,
              sourceSessionSeq: null,
              strength: "direct"
            }
          ],
          unknowns: [
            {
              path: "completion.code",
              reason: "not-observed"
            }
          ],
          bounds: {
            complete: true,
            omittedAttemptCount: 0,
            omittedValueCount: 0
          }
        },
        terminal: null
      }
    },
    partial: {
      provider: {
        state: "completed",
        text: null,
        errorCode: null,
        intentReason: null,
        moduleRevision: "vela-provider-surface-v1"
      },
      confirmation: {
        state: "rejected",
        beforeValue: null,
        proposedValue: null,
        errorCode: null,
        moduleRevision: "vela-objective-review-surface-v1"
      },
      driver: {
        state: "terminal",
        committed: false,
        objectiveId: "objective_agent_1",
        taskId: "agent_task_1",
        taskPlan: {
          contractType: "task-plan",
          planId: "task_plan_agent_1_logical_1_attempt_0",
          taskId: "agent_task_1",
          revision: 0,
          steps: [
            {
              stepId: "operate_layer_name_1_logical_1_attempt_0",
              kind: "operate",
              capabilityIntent: {
                contractType: "capability-intent",
                intentId: "intent_agent_1_logical_1_attempt_0",
                capabilityId: "set-layer-name-v1",
                requestedOperation: "mutate",
                params: {
                  name: "Vela Stream Test"
                }
              },
              rationale: "Apply the bounded single-step mutation objective.",
              metadata: {
                expectedValue: {
                  kind: "string",
                  data: "Vela Stream Test"
                }
              }
            }
          ]
        },
        turn: {
          sessionId: "session_1",
          turnId: "turn_2"
        },
        logicalPlan: {
          logicalPlanId: "logical_plan_agent_1",
          planSemanticSignature: '{"declaredStepCount":2,"stepSemanticSignatures":["{\\"capabilityId\\":\\"set-opacity-v1\\",\\"params\\":{\\"opacity\\":60},\\"targetScopeKind\\":\\"selected-layer\\"}","{\\"capabilityId\\":\\"set-layer-name-v1\\",\\"params\\":{\\"name\\":\\"Vela Stream Test\\"},\\"targetScopeKind\\":\\"selected-layer\\"}"]}',
          currentStepIndex: 1,
          stepCount: 2,
          currentStepId: "logical_step_agent_1_1",
          materializedTaskPlanId: "task_plan_agent_1_logical_1_attempt_0",
          materializedStepId: "operate_layer_name_1_logical_1_attempt_0",
          completedStepCount: 1,
          remainingStepCount: 1,
          partialCompletion: true,
          status: "rejected"
        },
        suspendedReview: null,
        reviewResolution: {
          reviewId: "agent_review_1_1_logical_1_attempt_0",
          revision: 1,
          outcome: "rejected",
          objectiveId: "objective_agent_1",
          taskId: "agent_task_1",
          taskPlanId: "task_plan_agent_1_logical_1_attempt_0",
          stepId: "operate_layer_name_1_logical_1_attempt_0"
        },
        terminal: {
          outcome: "rejected",
          code: "REVIEW_REJECTED"
        },
        counters: {
          observations: 3,
          reasoningTurns: 2,
          actions: 2,
          replans: 0
        },
        loop: {
          iterationIndex: 0,
          budgets: {
            iterationsUsed: 1,
            providerCallsUsed: 1,
            actionAttemptsUsed: 1
          },
          noProgressCount: 0
        },
        disposed: false
      },
      reviews: [
        {
          state: "confirmation-ready",
          reviewId: "agent_review_1_1_logical_0_attempt_0",
          revision: 1,
          target: {
            compId: "ae-project-1-item-1",
            layerId: "ae-project-1-item-1-layer-2"
          },
          approvalScope: "current-step",
          stepNumber: 1,
          stepCount: 2,
          canApprove: true,
          capabilityId: "set-opacity-v1",
          valueKind: "number",
          beforeValue: 20,
          proposedValue: 60,
          errorCode: null,
          moduleRevision: "vela-objective-review-surface-v1"
        },
        {
          state: "confirmation-ready",
          reviewId: "agent_review_1_1_logical_1_attempt_0",
          revision: 1,
          target: {
            compId: "ae-project-1-item-1",
            layerId: "ae-project-1-item-1-layer-2"
          },
          approvalScope: "current-step",
          stepNumber: 2,
          stepCount: 2,
          canApprove: true,
          capabilityId: "set-layer-name-v1",
          valueKind: "string",
          beforeValue: "Layer A",
          proposedValue: "Vela Stream Test",
          errorCode: null,
          moduleRevision: "vela-objective-review-surface-v1"
        }
      ],
      trajectory: {
        active: null,
        terminal: {
          schema: "vela.verified-trajectory-evidence.v1",
          authorityCapable: false,
          projectionId: "trajectory_projection_21",
          supersedesProjectionId: "trajectory_projection_20",
          objective: {
            sessionId: "session_1",
            objectiveId: "objective_agent_1",
            taskId: "agent_task_1",
            logicalPlanId: "logical_plan_agent_1"
          },
          lifecycle: {
            state: "terminal",
            lateEvidence: false
          },
          attempts: [
            {
              attemptId: "trajectory_attempt_3",
              correlation: {
                taskPlanId: "task_plan_agent_1_logical_0_attempt_0",
                taskPlanRevision: 0,
                materializedStepId: "operate_opacity_1_logical_0_attempt_0",
                intentId: "intent_agent_1_logical_0_attempt_0",
                logicalStepId: "logical_step_agent_1_0",
                logicalStepIndex: 0,
                materializationAttempt: 0,
                turnId: "turn_1",
                taskRunId: "task_run_1",
                authorizedPlanId: "confirmedPlan_3",
                executionPlanId: "plan_21c47f025144b6a32478126a53a03a8b6c8f90d5991294eb6ab31c5331d1e074",
                actionIndex: 0,
                providerRequestId: null,
                supersedesAttemptId: null
              },
              capabilityId: "set-opacity-v1",
              target: {
                targetRef: null,
                targetKind: "property"
              },
              intent: {
                submitted: true,
                admitted: true,
                review: "approved"
              },
              execution: {
                executionAttempted: true,
                hostInvocationAttempted: true,
                mutationDisposition: "mutated",
                reportedCommitted: true,
                hostCommitted: true,
                resultCode: null,
                resultingValueDigest: "sha256:f68c1b5924129c2acc17f412ec2e0532bbe46516e7b67e2fe7b8c6ee497cc31c"
              },
              verification: {
                attemptId: "trajectory_verify_12",
                sourceObservationId: "req_00000000000000000000000000000025",
                attempted: true,
                disposition: "verified-match",
                scope: "committed-target",
                targetRelation: "committed-target",
                freshAtRead: true,
                matches: true,
                expected: {
                  kind: "number",
                  data: 60
                },
                actual: {
                  kind: "number",
                  data: 60
                },
                actualDigest: "sha256:f68c1b5924129c2acc17f412ec2e0532bbe46516e7b67e2fe7b8c6ee497cc31c",
                code: null
              },
              completion: {
                outcome: "completed",
                superseded: false
              },
              provenance: [
                {
                  factPaths: [
                    "correlation",
                    "capabilityId",
                    "intent.submitted",
                    "verification.expected"
                  ],
                  class: "local-control-occurrence",
                  producer: "VelaAgentDriver",
                  contractRevision: "vela-trajectory-source-v1",
                  occurrenceId: "trajectory_occurrence_2",
                  sourceRequestId: null,
                  sourceSessionSeq: null,
                  strength: "direct"
                },
                {
                  factPaths: [
                    "intent.admitted",
                    "intent.review"
                  ],
                  class: "local-control-occurrence",
                  producer: "VelaAgentDriver",
                  contractRevision: "vela-trajectory-source-v1",
                  occurrenceId: "trajectory_occurrence_3",
                  sourceRequestId: null,
                  sourceSessionSeq: null,
                  strength: "direct"
                },
                {
                  factPaths: [
                    "intent.admitted",
                    "intent.review"
                  ],
                  class: "local-control-occurrence",
                  producer: "VelaAgentDriver",
                  contractRevision: "vela-trajectory-source-v1",
                  occurrenceId: "trajectory_occurrence_4",
                  sourceRequestId: null,
                  sourceSessionSeq: null,
                  strength: "direct"
                },
                {
                  factPaths: [
                    "correlation.executionPlanId",
                    "correlation.authorizedPlanId",
                    "correlation.taskRunId",
                    "correlation.actionIndex"
                  ],
                  class: "local-control-occurrence",
                  producer: "VelaRuntime",
                  contractRevision: "vela-trajectory-source-v1",
                  occurrenceId: "trajectory_occurrence_5",
                  sourceRequestId: null,
                  sourceSessionSeq: null,
                  strength: "direct"
                },
                {
                  factPaths: [
                    "execution.executionAttempted"
                  ],
                  class: "execution-result",
                  producer: "VelaExecutionPreflight",
                  contractRevision: "vela-trajectory-source-v1",
                  occurrenceId: "trajectory_occurrence_6",
                  sourceRequestId: null,
                  sourceSessionSeq: null,
                  strength: "direct"
                },
                {
                  factPaths: [
                    "execution.hostInvocationAttempted"
                  ],
                  class: "execution-result",
                  producer: "VelaExecutionAdapter",
                  contractRevision: "vela-trajectory-source-v1",
                  occurrenceId: "trajectory_occurrence_7",
                  sourceRequestId: "req_00000000000000000000000000000024",
                  sourceSessionSeq: null,
                  strength: "direct"
                },
                {
                  factPaths: [
                    "execution.reportedCommitted",
                    "execution.hostCommitted",
                    "execution.mutationDisposition",
                    "execution.resultCode",
                    "execution.resultingValueDigest"
                  ],
                  class: "host-commit-evidence",
                  producer: "VelaExecutionAdapter",
                  contractRevision: "vela-trajectory-source-v1",
                  occurrenceId: "trajectory_occurrence_8",
                  sourceRequestId: "req_00000000000000000000000000000024",
                  sourceSessionSeq: null,
                  strength: "direct"
                },
                {
                  factPaths: [
                    "execution.reportedCommitted"
                  ],
                  class: "execution-result",
                  producer: "VelaRuntime",
                  contractRevision: "vela-trajectory-source-v1",
                  occurrenceId: "trajectory_occurrence_9",
                  sourceRequestId: null,
                  sourceSessionSeq: null,
                  strength: "reduced"
                },
                {
                  factPaths: [
                    "verification.attemptId",
                    "verification.attempted",
                    "verification.scope"
                  ],
                  class: "local-control-occurrence",
                  producer: "VelaExecutionPreflight",
                  contractRevision: "vela-trajectory-source-v1",
                  occurrenceId: "trajectory_occurrence_10",
                  sourceRequestId: null,
                  sourceSessionSeq: null,
                  strength: "direct"
                },
                {
                  factPaths: [
                    "verification"
                  ],
                  class: "fresh-verify-evidence",
                  producer: "VelaExecutionPreflight",
                  contractRevision: "vela-trajectory-source-v1",
                  occurrenceId: "trajectory_occurrence_11",
                  sourceRequestId: "req_00000000000000000000000000000025",
                  sourceSessionSeq: null,
                  strength: "direct"
                },
                {
                  factPaths: [
                    "completion"
                  ],
                  class: "derived-objective-summary",
                  producer: "VelaAgentDriver",
                  contractRevision: "vela-trajectory-source-v1",
                  occurrenceId: "trajectory_occurrence_12",
                  sourceRequestId: null,
                  sourceSessionSeq: null,
                  strength: "derived"
                }
              ],
              unknowns: [
                {
                  path: "correlation.providerRequestId",
                  reason: "not-wired"
                },
                {
                  path: "target.targetRef",
                  reason: "not-wired"
                },
                {
                  path: "correlation.supersedesAttemptId",
                  reason: "not-observed"
                },
                {
                  path: "execution.resultCode",
                  reason: "not-observed"
                },
                {
                  path: "verification.code",
                  reason: "not-observed"
                }
              ]
            },
            {
              attemptId: "trajectory_attempt_16",
              correlation: {
                taskPlanId: "task_plan_agent_1_logical_1_attempt_0",
                taskPlanRevision: 0,
                materializedStepId: "operate_layer_name_1_logical_1_attempt_0",
                intentId: "intent_agent_1_logical_1_attempt_0",
                logicalStepId: "logical_step_agent_1_1",
                logicalStepIndex: 1,
                materializationAttempt: 0,
                turnId: "turn_2",
                taskRunId: null,
                authorizedPlanId: null,
                executionPlanId: null,
                actionIndex: null,
                providerRequestId: null,
                supersedesAttemptId: null
              },
              capabilityId: "set-layer-name-v1",
              target: {
                targetRef: null,
                targetKind: "layer-attribute"
              },
              intent: {
                submitted: true,
                admitted: true,
                review: "rejected"
              },
              execution: {
                executionAttempted: false,
                hostInvocationAttempted: false,
                mutationDisposition: "not-mutated",
                reportedCommitted: false,
                hostCommitted: null,
                resultCode: "REVIEW_REJECTED",
                resultingValueDigest: null
              },
              verification: {
                attemptId: null,
                sourceObservationId: null,
                attempted: false,
                disposition: "verification-not-run",
                scope: "unknown",
                targetRelation: "unproven",
                freshAtRead: null,
                matches: null,
                expected: {
                  kind: "string",
                  data: "Vela Stream Test"
                },
                actual: null,
                actualDigest: null,
                code: null
              },
              completion: {
                outcome: "rejected",
                superseded: false
              },
              provenance: [
                {
                  factPaths: [
                    "correlation",
                    "capabilityId",
                    "intent.submitted",
                    "verification.expected"
                  ],
                  class: "local-control-occurrence",
                  producer: "VelaAgentDriver",
                  contractRevision: "vela-trajectory-source-v1",
                  occurrenceId: "trajectory_occurrence_13",
                  sourceRequestId: null,
                  sourceSessionSeq: null,
                  strength: "direct"
                },
                {
                  factPaths: [
                    "intent.admitted",
                    "intent.review"
                  ],
                  class: "local-control-occurrence",
                  producer: "VelaAgentDriver",
                  contractRevision: "vela-trajectory-source-v1",
                  occurrenceId: "trajectory_occurrence_14",
                  sourceRequestId: null,
                  sourceSessionSeq: null,
                  strength: "direct"
                },
                {
                  factPaths: [
                    "intent.admitted",
                    "intent.review"
                  ],
                  class: "local-control-occurrence",
                  producer: "VelaAgentDriver",
                  contractRevision: "vela-trajectory-source-v1",
                  occurrenceId: "trajectory_occurrence_15",
                  sourceRequestId: null,
                  sourceSessionSeq: null,
                  strength: "direct"
                },
                {
                  factPaths: [
                    "execution.executionAttempted",
                    "execution.hostInvocationAttempted",
                    "execution.mutationDisposition",
                    "execution.reportedCommitted",
                    "verification.attempted",
                    "verification.disposition"
                  ],
                  class: "local-control-occurrence",
                  producer: "VelaAgentDriver",
                  contractRevision: "vela-trajectory-source-v1",
                  occurrenceId: "trajectory_occurrence_16",
                  sourceRequestId: null,
                  sourceSessionSeq: null,
                  strength: "direct"
                }
              ],
              unknowns: [
                {
                  path: "correlation.providerRequestId",
                  reason: "not-wired"
                },
                {
                  path: "target.targetRef",
                  reason: "not-wired"
                },
                {
                  path: "correlation.taskRunId",
                  reason: "not-observed"
                },
                {
                  path: "correlation.authorizedPlanId",
                  reason: "not-observed"
                },
                {
                  path: "correlation.executionPlanId",
                  reason: "not-observed"
                },
                {
                  path: "correlation.actionIndex",
                  reason: "not-observed"
                },
                {
                  path: "correlation.supersedesAttemptId",
                  reason: "not-observed"
                },
                {
                  path: "execution.hostCommitted",
                  reason: "not-observed"
                },
                {
                  path: "execution.resultingValueDigest",
                  reason: "not-observed"
                },
                {
                  path: "verification.attemptId",
                  reason: "not-observed"
                },
                {
                  path: "verification.sourceObservationId",
                  reason: "not-observed"
                },
                {
                  path: "verification.scope",
                  reason: "not-observed"
                },
                {
                  path: "verification.freshAtRead",
                  reason: "not-observed"
                },
                {
                  path: "verification.matches",
                  reason: "not-observed"
                },
                {
                  path: "verification.actual",
                  reason: "not-observed"
                },
                {
                  path: "verification.actualDigest",
                  reason: "not-observed"
                },
                {
                  path: "verification.code",
                  reason: "not-observed"
                }
              ]
            }
          ],
          completion: {
            outcome: "rejected",
            code: "REVIEW_REJECTED",
            coverage: "partial",
            declaredStepCount: 2,
            completedStepCount: 1,
            remainingStepCount: 1,
            verifiedEvidenceStepCount: 1,
            sourceAttemptIds: [
              "trajectory_attempt_3",
              "trajectory_attempt_16"
            ]
          },
          provenance: [
            {
              factPaths: [
                "objective"
              ],
              class: "local-control-occurrence",
              producer: "VelaAgentDriver",
              contractRevision: "vela-trajectory-source-v1",
              occurrenceId: "trajectory_occurrence_1",
              sourceRequestId: null,
              sourceSessionSeq: null,
              strength: "direct"
            },
            {
              factPaths: [
                "completion.outcome",
                "completion.completedStepCount",
                "completion.remainingStepCount"
              ],
              class: "derived-objective-summary",
              producer: "VelaAgentDriver",
              contractRevision: "vela-trajectory-source-v1",
              occurrenceId: "trajectory_occurrence_17",
              sourceRequestId: null,
              sourceSessionSeq: null,
              strength: "derived"
            }
          ],
          unknowns: [],
          bounds: {
            complete: true,
            omittedAttemptCount: 0,
            omittedValueCount: 0
          }
        }
      }
    },
    rejected: {
      provider: {
        state: "completed",
        text: null,
        errorCode: null,
        intentReason: null,
        moduleRevision: "vela-provider-surface-v1"
      },
      confirmation: {
        state: "rejected",
        beforeValue: null,
        proposedValue: null,
        errorCode: null,
        moduleRevision: "vela-objective-review-surface-v1"
      },
      driver: {
        state: "terminal",
        committed: false,
        objectiveId: "objective_agent_1",
        taskId: "agent_task_1",
        taskPlan: {
          contractType: "task-plan",
          planId: "task_plan_agent_1_logical_0_attempt_0",
          taskId: "agent_task_1",
          revision: 0,
          steps: [
            {
              stepId: "operate_opacity_1_logical_0_attempt_0",
              kind: "operate",
              capabilityIntent: {
                contractType: "capability-intent",
                intentId: "intent_agent_1_logical_0_attempt_0",
                capabilityId: "set-opacity-v1",
                requestedOperation: "mutate",
                params: {
                  opacity: 60
                }
              },
              rationale: "Apply the bounded single-step mutation objective.",
              metadata: {
                expectedValue: {
                  kind: "number",
                  data: 60
                }
              }
            }
          ]
        },
        turn: {
          sessionId: "session_1",
          turnId: "turn_1"
        },
        logicalPlan: {
          logicalPlanId: "logical_plan_agent_1",
          planSemanticSignature: '{"declaredStepCount":2,"stepSemanticSignatures":["{\\"capabilityId\\":\\"set-opacity-v1\\",\\"params\\":{\\"opacity\\":60},\\"targetScopeKind\\":\\"selected-layer\\"}","{\\"capabilityId\\":\\"set-layer-name-v1\\",\\"params\\":{\\"name\\":\\"Vela Stream Test\\"},\\"targetScopeKind\\":\\"selected-layer\\"}"]}',
          currentStepIndex: 0,
          stepCount: 2,
          currentStepId: "logical_step_agent_1_0",
          materializedTaskPlanId: "task_plan_agent_1_logical_0_attempt_0",
          materializedStepId: "operate_opacity_1_logical_0_attempt_0",
          completedStepCount: 0,
          remainingStepCount: 2,
          partialCompletion: false,
          status: "rejected"
        },
        suspendedReview: null,
        reviewResolution: {
          reviewId: "agent_review_1_1_logical_0_attempt_0",
          revision: 1,
          outcome: "rejected",
          objectiveId: "objective_agent_1",
          taskId: "agent_task_1",
          taskPlanId: "task_plan_agent_1_logical_0_attempt_0",
          stepId: "operate_opacity_1_logical_0_attempt_0"
        },
        terminal: {
          outcome: "rejected",
          code: "REVIEW_REJECTED"
        },
        counters: {
          observations: 1,
          reasoningTurns: 1,
          actions: 1,
          replans: 0
        },
        loop: {
          iterationIndex: 0,
          budgets: {
            iterationsUsed: 1,
            providerCallsUsed: 1,
            actionAttemptsUsed: 0
          },
          noProgressCount: 0
        },
        disposed: false
      },
      reviews: [
        {
          state: "confirmation-ready",
          reviewId: "agent_review_1_1_logical_0_attempt_0",
          revision: 1,
          target: {
            compId: "ae-project-1-item-1",
            layerId: "ae-project-1-item-1-layer-2"
          },
          approvalScope: "current-step",
          stepNumber: 1,
          stepCount: 2,
          canApprove: true,
          capabilityId: "set-opacity-v1",
          valueKind: "number",
          beforeValue: 20,
          proposedValue: 60,
          errorCode: null,
          moduleRevision: "vela-objective-review-surface-v1"
        }
      ],
      trajectory: {
        active: null,
        terminal: {
          schema: "vela.verified-trajectory-evidence.v1",
          authorityCapable: false,
          projectionId: "trajectory_projection_8",
          supersedesProjectionId: "trajectory_projection_7",
          objective: {
            sessionId: "session_1",
            objectiveId: "objective_agent_1",
            taskId: "agent_task_1",
            logicalPlanId: "logical_plan_agent_1"
          },
          lifecycle: {
            state: "terminal",
            lateEvidence: false
          },
          attempts: [
            {
              attemptId: "trajectory_attempt_3",
              correlation: {
                taskPlanId: "task_plan_agent_1_logical_0_attempt_0",
                taskPlanRevision: 0,
                materializedStepId: "operate_opacity_1_logical_0_attempt_0",
                intentId: "intent_agent_1_logical_0_attempt_0",
                logicalStepId: "logical_step_agent_1_0",
                logicalStepIndex: 0,
                materializationAttempt: 0,
                turnId: "turn_1",
                taskRunId: null,
                authorizedPlanId: null,
                executionPlanId: null,
                actionIndex: null,
                providerRequestId: null,
                supersedesAttemptId: null
              },
              capabilityId: "set-opacity-v1",
              target: {
                targetRef: null,
                targetKind: "property"
              },
              intent: {
                submitted: true,
                admitted: true,
                review: "rejected"
              },
              execution: {
                executionAttempted: false,
                hostInvocationAttempted: false,
                mutationDisposition: "not-mutated",
                reportedCommitted: false,
                hostCommitted: null,
                resultCode: "REVIEW_REJECTED",
                resultingValueDigest: null
              },
              verification: {
                attemptId: null,
                sourceObservationId: null,
                attempted: false,
                disposition: "verification-not-run",
                scope: "unknown",
                targetRelation: "unproven",
                freshAtRead: null,
                matches: null,
                expected: {
                  kind: "number",
                  data: 60
                },
                actual: null,
                actualDigest: null,
                code: null
              },
              completion: {
                outcome: "rejected",
                superseded: false
              },
              provenance: [
                {
                  factPaths: [
                    "correlation",
                    "capabilityId",
                    "intent.submitted",
                    "verification.expected"
                  ],
                  class: "local-control-occurrence",
                  producer: "VelaAgentDriver",
                  contractRevision: "vela-trajectory-source-v1",
                  occurrenceId: "trajectory_occurrence_2",
                  sourceRequestId: null,
                  sourceSessionSeq: null,
                  strength: "direct"
                },
                {
                  factPaths: [
                    "intent.admitted",
                    "intent.review"
                  ],
                  class: "local-control-occurrence",
                  producer: "VelaAgentDriver",
                  contractRevision: "vela-trajectory-source-v1",
                  occurrenceId: "trajectory_occurrence_3",
                  sourceRequestId: null,
                  sourceSessionSeq: null,
                  strength: "direct"
                },
                {
                  factPaths: [
                    "intent.admitted",
                    "intent.review"
                  ],
                  class: "local-control-occurrence",
                  producer: "VelaAgentDriver",
                  contractRevision: "vela-trajectory-source-v1",
                  occurrenceId: "trajectory_occurrence_4",
                  sourceRequestId: null,
                  sourceSessionSeq: null,
                  strength: "direct"
                },
                {
                  factPaths: [
                    "execution.executionAttempted",
                    "execution.hostInvocationAttempted",
                    "execution.mutationDisposition",
                    "execution.reportedCommitted",
                    "verification.attempted",
                    "verification.disposition"
                  ],
                  class: "local-control-occurrence",
                  producer: "VelaAgentDriver",
                  contractRevision: "vela-trajectory-source-v1",
                  occurrenceId: "trajectory_occurrence_5",
                  sourceRequestId: null,
                  sourceSessionSeq: null,
                  strength: "direct"
                }
              ],
              unknowns: [
                {
                  path: "correlation.providerRequestId",
                  reason: "not-wired"
                },
                {
                  path: "target.targetRef",
                  reason: "not-wired"
                },
                {
                  path: "correlation.taskRunId",
                  reason: "not-observed"
                },
                {
                  path: "correlation.authorizedPlanId",
                  reason: "not-observed"
                },
                {
                  path: "correlation.executionPlanId",
                  reason: "not-observed"
                },
                {
                  path: "correlation.actionIndex",
                  reason: "not-observed"
                },
                {
                  path: "correlation.supersedesAttemptId",
                  reason: "not-observed"
                },
                {
                  path: "execution.hostCommitted",
                  reason: "not-observed"
                },
                {
                  path: "execution.resultingValueDigest",
                  reason: "not-observed"
                },
                {
                  path: "verification.attemptId",
                  reason: "not-observed"
                },
                {
                  path: "verification.sourceObservationId",
                  reason: "not-observed"
                },
                {
                  path: "verification.scope",
                  reason: "not-observed"
                },
                {
                  path: "verification.freshAtRead",
                  reason: "not-observed"
                },
                {
                  path: "verification.matches",
                  reason: "not-observed"
                },
                {
                  path: "verification.actual",
                  reason: "not-observed"
                },
                {
                  path: "verification.actualDigest",
                  reason: "not-observed"
                },
                {
                  path: "verification.code",
                  reason: "not-observed"
                }
              ]
            }
          ],
          completion: {
            outcome: "rejected",
            code: "REVIEW_REJECTED",
            coverage: "none",
            declaredStepCount: 2,
            completedStepCount: 0,
            remainingStepCount: 2,
            verifiedEvidenceStepCount: 0,
            sourceAttemptIds: [
              "trajectory_attempt_3"
            ]
          },
          provenance: [
            {
              factPaths: [
                "objective"
              ],
              class: "local-control-occurrence",
              producer: "VelaAgentDriver",
              contractRevision: "vela-trajectory-source-v1",
              occurrenceId: "trajectory_occurrence_1",
              sourceRequestId: null,
              sourceSessionSeq: null,
              strength: "direct"
            },
            {
              factPaths: [
                "completion.outcome",
                "completion.completedStepCount",
                "completion.remainingStepCount"
              ],
              class: "derived-objective-summary",
              producer: "VelaAgentDriver",
              contractRevision: "vela-trajectory-source-v1",
              occurrenceId: "trajectory_occurrence_6",
              sourceRequestId: null,
              sourceSessionSeq: null,
              strength: "derived"
            }
          ],
          unknowns: [],
          bounds: {
            complete: true,
            omittedAttemptCount: 0,
            omittedValueCount: 0
          }
        }
      }
    },
    cancelled: {
      provider: {
        state: "cancelled",
        text: null,
        errorCode: null
      },
      confirmation: {
        state: "idle",
        beforeValue: null,
        proposedValue: null,
        errorCode: null,
        moduleRevision: "vela-confirmation-surface-v1"
      },
      driver: {
        state: "terminal",
        committed: false,
        objectiveId: "objective_agent_1",
        taskId: "agent_task_1",
        taskPlan: {
          contractType: "task-plan",
          planId: "task_plan_agent_1_logical_0_attempt_0",
          taskId: "agent_task_1",
          revision: 0,
          steps: [
            {
              stepId: "operate_opacity_1_logical_0_attempt_0",
              kind: "operate",
              capabilityIntent: {
                contractType: "capability-intent",
                intentId: "intent_agent_1_logical_0_attempt_0",
                capabilityId: "set-opacity-v1",
                requestedOperation: "mutate",
                params: {
                  opacity: 60
                }
              },
              rationale: "Apply the bounded single-step mutation objective.",
              metadata: {
                expectedValue: {
                  kind: "number",
                  data: 60
                }
              }
            }
          ]
        },
        turn: {
          sessionId: "session_1",
          turnId: "turn_1"
        },
        logicalPlan: {
          logicalPlanId: "logical_plan_agent_1",
          planSemanticSignature: '{"declaredStepCount":2,"stepSemanticSignatures":["{\\"capabilityId\\":\\"set-opacity-v1\\",\\"params\\":{\\"opacity\\":60},\\"targetScopeKind\\":\\"selected-layer\\"}","{\\"capabilityId\\":\\"set-layer-name-v1\\",\\"params\\":{\\"name\\":\\"Vela Stream Test\\"},\\"targetScopeKind\\":\\"selected-layer\\"}"]}',
          currentStepIndex: 0,
          stepCount: 2,
          currentStepId: "logical_step_agent_1_0",
          materializedTaskPlanId: "task_plan_agent_1_logical_0_attempt_0",
          materializedStepId: "operate_opacity_1_logical_0_attempt_0",
          completedStepCount: 0,
          remainingStepCount: 2,
          partialCompletion: false,
          status: "cancelled"
        },
        suspendedReview: null,
        reviewResolution: null,
        terminal: {
          outcome: "cancelled",
          code: "AGENT_DRIVER_CANCELLED"
        },
        counters: {
          observations: 1,
          reasoningTurns: 1,
          actions: 1,
          replans: 0
        },
        loop: {
          iterationIndex: 0,
          budgets: {
            iterationsUsed: 1,
            providerCallsUsed: 1,
            actionAttemptsUsed: 0
          },
          noProgressCount: 0
        },
        disposed: false
      },
      reviews: [
        {
          state: "confirmation-ready",
          reviewId: "agent_review_1_1_logical_0_attempt_0",
          revision: 1,
          target: {
            compId: "ae-project-1-item-1",
            layerId: "ae-project-1-item-1-layer-2"
          },
          approvalScope: "current-step",
          stepNumber: 1,
          stepCount: 2,
          canApprove: true,
          capabilityId: "set-opacity-v1",
          valueKind: "number",
          beforeValue: 20,
          proposedValue: 60,
          errorCode: null,
          moduleRevision: "vela-objective-review-surface-v1"
        }
      ],
      trajectory: {
        active: null,
        terminal: {
          schema: "vela.verified-trajectory-evidence.v1",
          authorityCapable: false,
          projectionId: "trajectory_projection_7",
          supersedesProjectionId: "trajectory_projection_6",
          objective: {
            sessionId: "session_1",
            objectiveId: "objective_agent_1",
            taskId: "agent_task_1",
            logicalPlanId: "logical_plan_agent_1"
          },
          lifecycle: {
            state: "terminal",
            lateEvidence: false
          },
          attempts: [
            {
              attemptId: "trajectory_attempt_3",
              correlation: {
                taskPlanId: "task_plan_agent_1_logical_0_attempt_0",
                taskPlanRevision: 0,
                materializedStepId: "operate_opacity_1_logical_0_attempt_0",
                intentId: "intent_agent_1_logical_0_attempt_0",
                logicalStepId: "logical_step_agent_1_0",
                logicalStepIndex: 0,
                materializationAttempt: 0,
                turnId: "turn_1",
                taskRunId: null,
                authorizedPlanId: null,
                executionPlanId: null,
                actionIndex: null,
                providerRequestId: null,
                supersedesAttemptId: null
              },
              capabilityId: "set-opacity-v1",
              target: {
                targetRef: null,
                targetKind: "property"
              },
              intent: {
                submitted: true,
                admitted: true,
                review: "pending"
              },
              execution: {
                executionAttempted: false,
                hostInvocationAttempted: false,
                mutationDisposition: "not-mutated",
                reportedCommitted: false,
                hostCommitted: null,
                resultCode: "LIFECYCLE_BLOCKED",
                resultingValueDigest: null
              },
              verification: {
                attemptId: null,
                sourceObservationId: null,
                attempted: false,
                disposition: "verification-not-run",
                scope: "unknown",
                targetRelation: "unproven",
                freshAtRead: null,
                matches: null,
                expected: {
                  kind: "number",
                  data: 60
                },
                actual: null,
                actualDigest: null,
                code: null
              },
              completion: {
                outcome: "cancelled",
                superseded: false
              },
              provenance: [
                {
                  factPaths: [
                    "correlation",
                    "capabilityId",
                    "intent.submitted",
                    "verification.expected"
                  ],
                  class: "local-control-occurrence",
                  producer: "VelaAgentDriver",
                  contractRevision: "vela-trajectory-source-v1",
                  occurrenceId: "trajectory_occurrence_2",
                  sourceRequestId: null,
                  sourceSessionSeq: null,
                  strength: "direct"
                },
                {
                  factPaths: [
                    "intent.admitted",
                    "intent.review"
                  ],
                  class: "local-control-occurrence",
                  producer: "VelaAgentDriver",
                  contractRevision: "vela-trajectory-source-v1",
                  occurrenceId: "trajectory_occurrence_3",
                  sourceRequestId: null,
                  sourceSessionSeq: null,
                  strength: "direct"
                },
                {
                  factPaths: [
                    "execution.executionAttempted",
                    "execution.hostInvocationAttempted",
                    "execution.mutationDisposition",
                    "execution.reportedCommitted",
                    "verification.attempted",
                    "verification.disposition"
                  ],
                  class: "local-control-occurrence",
                  producer: "VelaRuntime",
                  contractRevision: "vela-trajectory-source-v1",
                  occurrenceId: "trajectory_occurrence_4",
                  sourceRequestId: null,
                  sourceSessionSeq: null,
                  strength: "direct"
                }
              ],
              unknowns: [
                {
                  path: "correlation.providerRequestId",
                  reason: "not-wired"
                },
                {
                  path: "target.targetRef",
                  reason: "not-wired"
                },
                {
                  path: "correlation.taskRunId",
                  reason: "not-observed"
                },
                {
                  path: "correlation.authorizedPlanId",
                  reason: "not-observed"
                },
                {
                  path: "correlation.executionPlanId",
                  reason: "not-observed"
                },
                {
                  path: "correlation.actionIndex",
                  reason: "not-observed"
                },
                {
                  path: "correlation.supersedesAttemptId",
                  reason: "not-observed"
                },
                {
                  path: "execution.hostCommitted",
                  reason: "not-observed"
                },
                {
                  path: "execution.resultingValueDigest",
                  reason: "not-observed"
                },
                {
                  path: "verification.attemptId",
                  reason: "not-observed"
                },
                {
                  path: "verification.sourceObservationId",
                  reason: "not-observed"
                },
                {
                  path: "verification.scope",
                  reason: "not-observed"
                },
                {
                  path: "verification.freshAtRead",
                  reason: "not-observed"
                },
                {
                  path: "verification.matches",
                  reason: "not-observed"
                },
                {
                  path: "verification.actual",
                  reason: "not-observed"
                },
                {
                  path: "verification.actualDigest",
                  reason: "not-observed"
                },
                {
                  path: "verification.code",
                  reason: "not-observed"
                }
              ]
            }
          ],
          completion: {
            outcome: "cancelled",
            code: "AGENT_DRIVER_CANCELLED",
            coverage: "none",
            declaredStepCount: 2,
            completedStepCount: 0,
            remainingStepCount: 2,
            verifiedEvidenceStepCount: 0,
            sourceAttemptIds: [
              "trajectory_attempt_3"
            ]
          },
          provenance: [
            {
              factPaths: [
                "objective"
              ],
              class: "local-control-occurrence",
              producer: "VelaAgentDriver",
              contractRevision: "vela-trajectory-source-v1",
              occurrenceId: "trajectory_occurrence_1",
              sourceRequestId: null,
              sourceSessionSeq: null,
              strength: "direct"
            },
            {
              factPaths: [
                "completion.outcome",
                "completion.completedStepCount",
                "completion.remainingStepCount"
              ],
              class: "derived-objective-summary",
              producer: "VelaAgentDriver",
              contractRevision: "vela-trajectory-source-v1",
              occurrenceId: "trajectory_occurrence_5",
              sourceRequestId: null,
              sourceSessionSeq: null,
              strength: "derived"
            }
          ],
          unknowns: [],
          bounds: {
            complete: true,
            omittedAttemptCount: 0,
            omittedValueCount: 0
          }
        }
      }
    },
    failed: {
      provider: {
        state: "objective-blocked",
        text: null,
        errorCode: "AGENT_DRIVER_TASK_UNVERIFIED"
      },
      confirmation: {
        state: "idle",
        beforeValue: null,
        proposedValue: null,
        errorCode: null,
        moduleRevision: "vela-confirmation-surface-v1"
      },
      driver: {
        state: "terminal",
        committed: true,
        objectiveId: "objective_agent_1",
        taskId: "agent_task_1",
        taskPlan: {
          contractType: "task-plan",
          planId: "task_plan_agent_1_logical_0_attempt_0",
          taskId: "agent_task_1",
          revision: 0,
          steps: [
            {
              stepId: "operate_opacity_1_logical_0_attempt_0",
              kind: "operate",
              capabilityIntent: {
                contractType: "capability-intent",
                intentId: "intent_agent_1_logical_0_attempt_0",
                capabilityId: "set-opacity-v1",
                requestedOperation: "mutate",
                params: {
                  opacity: 60
                }
              },
              rationale: "Apply the bounded single-step mutation objective.",
              metadata: {
                expectedValue: {
                  kind: "number",
                  data: 60
                }
              }
            }
          ]
        },
        turn: {
          sessionId: "session_1",
          turnId: "turn_1"
        },
        logicalPlan: {
          logicalPlanId: "logical_plan_agent_1",
          planSemanticSignature: '{"declaredStepCount":2,"stepSemanticSignatures":["{\\"capabilityId\\":\\"set-opacity-v1\\",\\"params\\":{\\"opacity\\":60},\\"targetScopeKind\\":\\"selected-layer\\"}","{\\"capabilityId\\":\\"set-layer-name-v1\\",\\"params\\":{\\"name\\":\\"Vela Stream Test\\"},\\"targetScopeKind\\":\\"selected-layer\\"}"]}',
          currentStepIndex: 0,
          stepCount: 2,
          currentStepId: "logical_step_agent_1_0",
          materializedTaskPlanId: "task_plan_agent_1_logical_0_attempt_0",
          materializedStepId: "operate_opacity_1_logical_0_attempt_0",
          completedStepCount: 0,
          remainingStepCount: 2,
          partialCompletion: false,
          status: "blocked"
        },
        suspendedReview: null,
        reviewResolution: {
          reviewId: "agent_review_1_1_logical_0_attempt_0",
          revision: 1,
          outcome: "approved",
          objectiveId: "objective_agent_1",
          taskId: "agent_task_1",
          taskPlanId: "task_plan_agent_1_logical_0_attempt_0",
          stepId: "operate_opacity_1_logical_0_attempt_0"
        },
        terminal: {
          outcome: "blocked",
          code: "AGENT_DRIVER_TASK_UNVERIFIED"
        },
        counters: {
          observations: 2,
          reasoningTurns: 1,
          actions: 1,
          replans: 0
        },
        loop: {
          iterationIndex: 0,
          budgets: {
            iterationsUsed: 1,
            providerCallsUsed: 1,
            actionAttemptsUsed: 1
          },
          noProgressCount: 0
        },
        disposed: false
      },
      reviews: [
        {
          state: "confirmation-ready",
          reviewId: "agent_review_1_1_logical_0_attempt_0",
          revision: 1,
          target: {
            compId: "ae-project-1-item-1",
            layerId: "ae-project-1-item-1-layer-2"
          },
          approvalScope: "current-step",
          stepNumber: 1,
          stepCount: 2,
          canApprove: true,
          capabilityId: "set-opacity-v1",
          valueKind: "number",
          beforeValue: 20,
          proposedValue: 60,
          errorCode: null,
          moduleRevision: "vela-objective-review-surface-v1"
        }
      ],
      trajectory: {
        active: null,
        terminal: {
          schema: "vela.verified-trajectory-evidence.v1",
          authorityCapable: false,
          projectionId: "trajectory_projection_15",
          supersedesProjectionId: "trajectory_projection_14",
          objective: {
            sessionId: "session_1",
            objectiveId: "objective_agent_1",
            taskId: "agent_task_1",
            logicalPlanId: "logical_plan_agent_1"
          },
          lifecycle: {
            state: "terminal",
            lateEvidence: false
          },
          attempts: [
            {
              attemptId: "trajectory_attempt_3",
              correlation: {
                taskPlanId: "task_plan_agent_1_logical_0_attempt_0",
                taskPlanRevision: 0,
                materializedStepId: "operate_opacity_1_logical_0_attempt_0",
                intentId: "intent_agent_1_logical_0_attempt_0",
                logicalStepId: "logical_step_agent_1_0",
                logicalStepIndex: 0,
                materializationAttempt: 0,
                turnId: "turn_1",
                taskRunId: "task_run_1",
                authorizedPlanId: "confirmedPlan_3",
                executionPlanId: "plan_21c47f025144b6a32478126a53a03a8b6c8f90d5991294eb6ab31c5331d1e074",
                actionIndex: 0,
                providerRequestId: null,
                supersedesAttemptId: null
              },
              capabilityId: "set-opacity-v1",
              target: {
                targetRef: null,
                targetKind: "property"
              },
              intent: {
                submitted: true,
                admitted: true,
                review: "approved"
              },
              execution: {
                executionAttempted: true,
                hostInvocationAttempted: true,
                mutationDisposition: "mutated",
                reportedCommitted: true,
                hostCommitted: true,
                resultCode: null,
                resultingValueDigest: "sha256:f68c1b5924129c2acc17f412ec2e0532bbe46516e7b67e2fe7b8c6ee497cc31c"
              },
              verification: {
                attemptId: "trajectory_verify_12",
                sourceObservationId: "req_00000000000000000000000000000025",
                attempted: true,
                disposition: "verified-mismatch",
                scope: "committed-target",
                targetRelation: "committed-target",
                freshAtRead: true,
                matches: false,
                expected: {
                  kind: "number",
                  data: 60
                },
                actual: {
                  kind: "number",
                  data: 12
                },
                actualDigest: "sha256:2ed1b4e629f16db96a9bbb3d7e174ae754c18df94628e1a11848f5cf329f1029",
                code: null
              },
              completion: {
                outcome: "blocked",
                superseded: false
              },
              provenance: [
                {
                  factPaths: [
                    "correlation",
                    "capabilityId",
                    "intent.submitted",
                    "verification.expected"
                  ],
                  class: "local-control-occurrence",
                  producer: "VelaAgentDriver",
                  contractRevision: "vela-trajectory-source-v1",
                  occurrenceId: "trajectory_occurrence_2",
                  sourceRequestId: null,
                  sourceSessionSeq: null,
                  strength: "direct"
                },
                {
                  factPaths: [
                    "intent.admitted",
                    "intent.review"
                  ],
                  class: "local-control-occurrence",
                  producer: "VelaAgentDriver",
                  contractRevision: "vela-trajectory-source-v1",
                  occurrenceId: "trajectory_occurrence_3",
                  sourceRequestId: null,
                  sourceSessionSeq: null,
                  strength: "direct"
                },
                {
                  factPaths: [
                    "intent.admitted",
                    "intent.review"
                  ],
                  class: "local-control-occurrence",
                  producer: "VelaAgentDriver",
                  contractRevision: "vela-trajectory-source-v1",
                  occurrenceId: "trajectory_occurrence_4",
                  sourceRequestId: null,
                  sourceSessionSeq: null,
                  strength: "direct"
                },
                {
                  factPaths: [
                    "correlation.executionPlanId",
                    "correlation.authorizedPlanId",
                    "correlation.taskRunId",
                    "correlation.actionIndex"
                  ],
                  class: "local-control-occurrence",
                  producer: "VelaRuntime",
                  contractRevision: "vela-trajectory-source-v1",
                  occurrenceId: "trajectory_occurrence_5",
                  sourceRequestId: null,
                  sourceSessionSeq: null,
                  strength: "direct"
                },
                {
                  factPaths: [
                    "execution.executionAttempted"
                  ],
                  class: "execution-result",
                  producer: "VelaExecutionPreflight",
                  contractRevision: "vela-trajectory-source-v1",
                  occurrenceId: "trajectory_occurrence_6",
                  sourceRequestId: null,
                  sourceSessionSeq: null,
                  strength: "direct"
                },
                {
                  factPaths: [
                    "execution.hostInvocationAttempted"
                  ],
                  class: "execution-result",
                  producer: "VelaExecutionAdapter",
                  contractRevision: "vela-trajectory-source-v1",
                  occurrenceId: "trajectory_occurrence_7",
                  sourceRequestId: "req_00000000000000000000000000000024",
                  sourceSessionSeq: null,
                  strength: "direct"
                },
                {
                  factPaths: [
                    "execution.reportedCommitted",
                    "execution.hostCommitted",
                    "execution.mutationDisposition",
                    "execution.resultCode",
                    "execution.resultingValueDigest"
                  ],
                  class: "host-commit-evidence",
                  producer: "VelaExecutionAdapter",
                  contractRevision: "vela-trajectory-source-v1",
                  occurrenceId: "trajectory_occurrence_8",
                  sourceRequestId: "req_00000000000000000000000000000024",
                  sourceSessionSeq: null,
                  strength: "direct"
                },
                {
                  factPaths: [
                    "execution.reportedCommitted"
                  ],
                  class: "execution-result",
                  producer: "VelaRuntime",
                  contractRevision: "vela-trajectory-source-v1",
                  occurrenceId: "trajectory_occurrence_9",
                  sourceRequestId: null,
                  sourceSessionSeq: null,
                  strength: "reduced"
                },
                {
                  factPaths: [
                    "verification.attemptId",
                    "verification.attempted",
                    "verification.scope"
                  ],
                  class: "local-control-occurrence",
                  producer: "VelaExecutionPreflight",
                  contractRevision: "vela-trajectory-source-v1",
                  occurrenceId: "trajectory_occurrence_10",
                  sourceRequestId: null,
                  sourceSessionSeq: null,
                  strength: "direct"
                },
                {
                  factPaths: [
                    "verification"
                  ],
                  class: "fresh-verify-evidence",
                  producer: "VelaExecutionPreflight",
                  contractRevision: "vela-trajectory-source-v1",
                  occurrenceId: "trajectory_occurrence_11",
                  sourceRequestId: "req_00000000000000000000000000000025",
                  sourceSessionSeq: null,
                  strength: "direct"
                }
              ],
              unknowns: [
                {
                  path: "correlation.providerRequestId",
                  reason: "not-wired"
                },
                {
                  path: "target.targetRef",
                  reason: "not-wired"
                },
                {
                  path: "correlation.supersedesAttemptId",
                  reason: "not-observed"
                },
                {
                  path: "execution.resultCode",
                  reason: "not-observed"
                },
                {
                  path: "verification.code",
                  reason: "not-observed"
                }
              ]
            }
          ],
          completion: {
            outcome: "blocked",
            code: "AGENT_DRIVER_TASK_UNVERIFIED",
            coverage: "none",
            declaredStepCount: 2,
            completedStepCount: 0,
            remainingStepCount: 2,
            verifiedEvidenceStepCount: 0,
            sourceAttemptIds: [
              "trajectory_attempt_3"
            ]
          },
          provenance: [
            {
              factPaths: [
                "objective"
              ],
              class: "local-control-occurrence",
              producer: "VelaAgentDriver",
              contractRevision: "vela-trajectory-source-v1",
              occurrenceId: "trajectory_occurrence_1",
              sourceRequestId: null,
              sourceSessionSeq: null,
              strength: "direct"
            },
            {
              factPaths: [
                "completion.outcome",
                "completion.completedStepCount",
                "completion.remainingStepCount"
              ],
              class: "derived-objective-summary",
              producer: "VelaAgentDriver",
              contractRevision: "vela-trajectory-source-v1",
              occurrenceId: "trajectory_occurrence_12",
              sourceRequestId: null,
              sourceSessionSeq: null,
              strength: "derived"
            }
          ],
          unknowns: [],
          bounds: {
            complete: true,
            omittedAttemptCount: 0,
            omittedValueCount: 0
          }
        }
      }
    },
    completed: {
      provider: {
        state: "completed",
        text: null,
        errorCode: null,
        intentReason: null,
        moduleRevision: "vela-provider-surface-v1"
      },
      confirmation: {
        state: "idle",
        beforeValue: null,
        proposedValue: null,
        errorCode: null,
        moduleRevision: "vela-confirmation-surface-v1"
      },
      driver: {
        state: "terminal",
        committed: true,
        objectiveId: "objective_agent_1",
        taskId: "agent_task_1",
        taskPlan: {
          contractType: "task-plan",
          planId: "task_plan_agent_1_logical_1_attempt_0",
          taskId: "agent_task_1",
          revision: 0,
          steps: [
            {
              stepId: "operate_layer_name_1_logical_1_attempt_0",
              kind: "operate",
              capabilityIntent: {
                contractType: "capability-intent",
                intentId: "intent_agent_1_logical_1_attempt_0",
                capabilityId: "set-layer-name-v1",
                requestedOperation: "mutate",
                params: {
                  name: "Vela Stream Test"
                }
              },
              rationale: "Apply the bounded single-step mutation objective.",
              metadata: {
                expectedValue: {
                  kind: "string",
                  data: "Vela Stream Test"
                }
              }
            }
          ]
        },
        turn: {
          sessionId: "session_1",
          turnId: "turn_2"
        },
        logicalPlan: {
          logicalPlanId: "logical_plan_agent_1",
          planSemanticSignature: '{"declaredStepCount":2,"stepSemanticSignatures":["{\\"capabilityId\\":\\"set-opacity-v1\\",\\"params\\":{\\"opacity\\":60},\\"targetScopeKind\\":\\"selected-layer\\"}","{\\"capabilityId\\":\\"set-layer-name-v1\\",\\"params\\":{\\"name\\":\\"Vela Stream Test\\"},\\"targetScopeKind\\":\\"selected-layer\\"}"]}',
          currentStepIndex: 1,
          stepCount: 2,
          currentStepId: "logical_step_agent_1_1",
          materializedTaskPlanId: "task_plan_agent_1_logical_1_attempt_0",
          materializedStepId: "operate_layer_name_1_logical_1_attempt_0",
          completedStepCount: 2,
          remainingStepCount: 0,
          partialCompletion: false,
          status: "completed"
        },
        suspendedReview: null,
        reviewResolution: {
          reviewId: "agent_review_1_1_logical_1_attempt_0",
          revision: 1,
          outcome: "approved",
          objectiveId: "objective_agent_1",
          taskId: "agent_task_1",
          taskPlanId: "task_plan_agent_1_logical_1_attempt_0",
          stepId: "operate_layer_name_1_logical_1_attempt_0"
        },
        terminal: {
          outcome: "completed",
          code: null
        },
        counters: {
          observations: 4,
          reasoningTurns: 2,
          actions: 2,
          replans: 0
        },
        loop: {
          iterationIndex: 0,
          budgets: {
            iterationsUsed: 1,
            providerCallsUsed: 1,
            actionAttemptsUsed: 2
          },
          noProgressCount: 0
        },
        disposed: false
      },
      reviews: [
        {
          state: "confirmation-ready",
          reviewId: "agent_review_1_1_logical_0_attempt_0",
          revision: 1,
          target: {
            compId: "ae-project-1-item-1",
            layerId: "ae-project-1-item-1-layer-2"
          },
          approvalScope: "current-step",
          stepNumber: 1,
          stepCount: 2,
          canApprove: true,
          capabilityId: "set-opacity-v1",
          valueKind: "number",
          beforeValue: 20,
          proposedValue: 60,
          errorCode: null,
          moduleRevision: "vela-objective-review-surface-v1"
        },
        {
          state: "confirmation-ready",
          reviewId: "agent_review_1_1_logical_1_attempt_0",
          revision: 1,
          target: {
            compId: "ae-project-1-item-1",
            layerId: "ae-project-1-item-1-layer-2"
          },
          approvalScope: "current-step",
          stepNumber: 2,
          stepCount: 2,
          canApprove: true,
          capabilityId: "set-layer-name-v1",
          valueKind: "string",
          beforeValue: "Layer A",
          proposedValue: "Vela Stream Test",
          errorCode: null,
          moduleRevision: "vela-objective-review-surface-v1"
        }
      ],
      trajectory: {
        active: null,
        terminal: {
          schema: "vela.verified-trajectory-evidence.v1",
          authorityCapable: false,
          projectionId: "trajectory_projection_29",
          supersedesProjectionId: "trajectory_projection_28",
          objective: {
            sessionId: "session_1",
            objectiveId: "objective_agent_1",
            taskId: "agent_task_1",
            logicalPlanId: "logical_plan_agent_1"
          },
          lifecycle: {
            state: "terminal",
            lateEvidence: false
          },
          attempts: [
            {
              attemptId: "trajectory_attempt_3",
              correlation: {
                taskPlanId: "task_plan_agent_1_logical_0_attempt_0",
                taskPlanRevision: 0,
                materializedStepId: "operate_opacity_1_logical_0_attempt_0",
                intentId: "intent_agent_1_logical_0_attempt_0",
                logicalStepId: "logical_step_agent_1_0",
                logicalStepIndex: 0,
                materializationAttempt: 0,
                turnId: "turn_1",
                taskRunId: "task_run_1",
                authorizedPlanId: "confirmedPlan_3",
                executionPlanId: "plan_21c47f025144b6a32478126a53a03a8b6c8f90d5991294eb6ab31c5331d1e074",
                actionIndex: 0,
                providerRequestId: null,
                supersedesAttemptId: null
              },
              capabilityId: "set-opacity-v1",
              target: {
                targetRef: null,
                targetKind: "property"
              },
              intent: {
                submitted: true,
                admitted: true,
                review: "approved"
              },
              execution: {
                executionAttempted: true,
                hostInvocationAttempted: true,
                mutationDisposition: "mutated",
                reportedCommitted: true,
                hostCommitted: true,
                resultCode: null,
                resultingValueDigest: "sha256:f68c1b5924129c2acc17f412ec2e0532bbe46516e7b67e2fe7b8c6ee497cc31c"
              },
              verification: {
                attemptId: "trajectory_verify_12",
                sourceObservationId: "req_00000000000000000000000000000025",
                attempted: true,
                disposition: "verified-match",
                scope: "committed-target",
                targetRelation: "committed-target",
                freshAtRead: true,
                matches: true,
                expected: {
                  kind: "number",
                  data: 60
                },
                actual: {
                  kind: "number",
                  data: 60
                },
                actualDigest: "sha256:f68c1b5924129c2acc17f412ec2e0532bbe46516e7b67e2fe7b8c6ee497cc31c",
                code: null
              },
              completion: {
                outcome: "completed",
                superseded: false
              },
              provenance: [
                {
                  factPaths: [
                    "correlation",
                    "capabilityId",
                    "intent.submitted",
                    "verification.expected"
                  ],
                  class: "local-control-occurrence",
                  producer: "VelaAgentDriver",
                  contractRevision: "vela-trajectory-source-v1",
                  occurrenceId: "trajectory_occurrence_2",
                  sourceRequestId: null,
                  sourceSessionSeq: null,
                  strength: "direct"
                },
                {
                  factPaths: [
                    "intent.admitted",
                    "intent.review"
                  ],
                  class: "local-control-occurrence",
                  producer: "VelaAgentDriver",
                  contractRevision: "vela-trajectory-source-v1",
                  occurrenceId: "trajectory_occurrence_3",
                  sourceRequestId: null,
                  sourceSessionSeq: null,
                  strength: "direct"
                },
                {
                  factPaths: [
                    "intent.admitted",
                    "intent.review"
                  ],
                  class: "local-control-occurrence",
                  producer: "VelaAgentDriver",
                  contractRevision: "vela-trajectory-source-v1",
                  occurrenceId: "trajectory_occurrence_4",
                  sourceRequestId: null,
                  sourceSessionSeq: null,
                  strength: "direct"
                },
                {
                  factPaths: [
                    "correlation.executionPlanId",
                    "correlation.authorizedPlanId",
                    "correlation.taskRunId",
                    "correlation.actionIndex"
                  ],
                  class: "local-control-occurrence",
                  producer: "VelaRuntime",
                  contractRevision: "vela-trajectory-source-v1",
                  occurrenceId: "trajectory_occurrence_5",
                  sourceRequestId: null,
                  sourceSessionSeq: null,
                  strength: "direct"
                },
                {
                  factPaths: [
                    "execution.executionAttempted"
                  ],
                  class: "execution-result",
                  producer: "VelaExecutionPreflight",
                  contractRevision: "vela-trajectory-source-v1",
                  occurrenceId: "trajectory_occurrence_6",
                  sourceRequestId: null,
                  sourceSessionSeq: null,
                  strength: "direct"
                },
                {
                  factPaths: [
                    "execution.hostInvocationAttempted"
                  ],
                  class: "execution-result",
                  producer: "VelaExecutionAdapter",
                  contractRevision: "vela-trajectory-source-v1",
                  occurrenceId: "trajectory_occurrence_7",
                  sourceRequestId: "req_00000000000000000000000000000024",
                  sourceSessionSeq: null,
                  strength: "direct"
                },
                {
                  factPaths: [
                    "execution.reportedCommitted",
                    "execution.hostCommitted",
                    "execution.mutationDisposition",
                    "execution.resultCode",
                    "execution.resultingValueDigest"
                  ],
                  class: "host-commit-evidence",
                  producer: "VelaExecutionAdapter",
                  contractRevision: "vela-trajectory-source-v1",
                  occurrenceId: "trajectory_occurrence_8",
                  sourceRequestId: "req_00000000000000000000000000000024",
                  sourceSessionSeq: null,
                  strength: "direct"
                },
                {
                  factPaths: [
                    "execution.reportedCommitted"
                  ],
                  class: "execution-result",
                  producer: "VelaRuntime",
                  contractRevision: "vela-trajectory-source-v1",
                  occurrenceId: "trajectory_occurrence_9",
                  sourceRequestId: null,
                  sourceSessionSeq: null,
                  strength: "reduced"
                },
                {
                  factPaths: [
                    "verification.attemptId",
                    "verification.attempted",
                    "verification.scope"
                  ],
                  class: "local-control-occurrence",
                  producer: "VelaExecutionPreflight",
                  contractRevision: "vela-trajectory-source-v1",
                  occurrenceId: "trajectory_occurrence_10",
                  sourceRequestId: null,
                  sourceSessionSeq: null,
                  strength: "direct"
                },
                {
                  factPaths: [
                    "verification"
                  ],
                  class: "fresh-verify-evidence",
                  producer: "VelaExecutionPreflight",
                  contractRevision: "vela-trajectory-source-v1",
                  occurrenceId: "trajectory_occurrence_11",
                  sourceRequestId: "req_00000000000000000000000000000025",
                  sourceSessionSeq: null,
                  strength: "direct"
                },
                {
                  factPaths: [
                    "completion"
                  ],
                  class: "derived-objective-summary",
                  producer: "VelaAgentDriver",
                  contractRevision: "vela-trajectory-source-v1",
                  occurrenceId: "trajectory_occurrence_12",
                  sourceRequestId: null,
                  sourceSessionSeq: null,
                  strength: "derived"
                }
              ],
              unknowns: [
                {
                  path: "correlation.providerRequestId",
                  reason: "not-wired"
                },
                {
                  path: "target.targetRef",
                  reason: "not-wired"
                },
                {
                  path: "correlation.supersedesAttemptId",
                  reason: "not-observed"
                },
                {
                  path: "execution.resultCode",
                  reason: "not-observed"
                },
                {
                  path: "verification.code",
                  reason: "not-observed"
                }
              ]
            },
            {
              attemptId: "trajectory_attempt_16",
              correlation: {
                taskPlanId: "task_plan_agent_1_logical_1_attempt_0",
                taskPlanRevision: 0,
                materializedStepId: "operate_layer_name_1_logical_1_attempt_0",
                intentId: "intent_agent_1_logical_1_attempt_0",
                logicalStepId: "logical_step_agent_1_1",
                logicalStepIndex: 1,
                materializationAttempt: 0,
                turnId: "turn_2",
                taskRunId: "task_run_2",
                authorizedPlanId: "confirmedPlan_6",
                executionPlanId: "plan_e0d74af3268e5ee6192ed27196b35f845999568c1c895b1cc0a654fc44f2587c",
                actionIndex: 0,
                providerRequestId: null,
                supersedesAttemptId: null
              },
              capabilityId: "set-layer-name-v1",
              target: {
                targetRef: null,
                targetKind: "layer-attribute"
              },
              intent: {
                submitted: true,
                admitted: true,
                review: "approved"
              },
              execution: {
                executionAttempted: true,
                hostInvocationAttempted: true,
                mutationDisposition: "mutated",
                reportedCommitted: true,
                hostCommitted: true,
                resultCode: null,
                resultingValueDigest: "sha256:7454aacdf35d4c69feb24f4385133526a20ae6921554010d55df9e6349d2f74a"
              },
              verification: {
                attemptId: "trajectory_verify_25",
                sourceObservationId: "req_00000000000000000000000000000044",
                attempted: true,
                disposition: "verified-match",
                scope: "committed-target",
                targetRelation: "committed-target",
                freshAtRead: true,
                matches: true,
                expected: {
                  kind: "string",
                  data: "Vela Stream Test"
                },
                actual: {
                  kind: "string",
                  data: "Vela Stream Test"
                },
                actualDigest: "sha256:7454aacdf35d4c69feb24f4385133526a20ae6921554010d55df9e6349d2f74a",
                code: null
              },
              completion: {
                outcome: "completed",
                superseded: false
              },
              provenance: [
                {
                  factPaths: [
                    "correlation",
                    "capabilityId",
                    "intent.submitted",
                    "verification.expected"
                  ],
                  class: "local-control-occurrence",
                  producer: "VelaAgentDriver",
                  contractRevision: "vela-trajectory-source-v1",
                  occurrenceId: "trajectory_occurrence_13",
                  sourceRequestId: null,
                  sourceSessionSeq: null,
                  strength: "direct"
                },
                {
                  factPaths: [
                    "intent.admitted",
                    "intent.review"
                  ],
                  class: "local-control-occurrence",
                  producer: "VelaAgentDriver",
                  contractRevision: "vela-trajectory-source-v1",
                  occurrenceId: "trajectory_occurrence_14",
                  sourceRequestId: null,
                  sourceSessionSeq: null,
                  strength: "direct"
                },
                {
                  factPaths: [
                    "intent.admitted",
                    "intent.review"
                  ],
                  class: "local-control-occurrence",
                  producer: "VelaAgentDriver",
                  contractRevision: "vela-trajectory-source-v1",
                  occurrenceId: "trajectory_occurrence_15",
                  sourceRequestId: null,
                  sourceSessionSeq: null,
                  strength: "direct"
                },
                {
                  factPaths: [
                    "correlation.executionPlanId",
                    "correlation.authorizedPlanId",
                    "correlation.taskRunId",
                    "correlation.actionIndex"
                  ],
                  class: "local-control-occurrence",
                  producer: "VelaRuntime",
                  contractRevision: "vela-trajectory-source-v1",
                  occurrenceId: "trajectory_occurrence_16",
                  sourceRequestId: null,
                  sourceSessionSeq: null,
                  strength: "direct"
                },
                {
                  factPaths: [
                    "execution.executionAttempted"
                  ],
                  class: "execution-result",
                  producer: "VelaExecutionPreflight",
                  contractRevision: "vela-trajectory-source-v1",
                  occurrenceId: "trajectory_occurrence_17",
                  sourceRequestId: null,
                  sourceSessionSeq: null,
                  strength: "direct"
                },
                {
                  factPaths: [
                    "execution.hostInvocationAttempted"
                  ],
                  class: "execution-result",
                  producer: "VelaExecutionAdapter",
                  contractRevision: "vela-trajectory-source-v1",
                  occurrenceId: "trajectory_occurrence_18",
                  sourceRequestId: "req_00000000000000000000000000000043",
                  sourceSessionSeq: null,
                  strength: "direct"
                },
                {
                  factPaths: [
                    "execution.reportedCommitted",
                    "execution.hostCommitted",
                    "execution.mutationDisposition",
                    "execution.resultCode",
                    "execution.resultingValueDigest"
                  ],
                  class: "host-commit-evidence",
                  producer: "VelaExecutionAdapter",
                  contractRevision: "vela-trajectory-source-v1",
                  occurrenceId: "trajectory_occurrence_19",
                  sourceRequestId: "req_00000000000000000000000000000043",
                  sourceSessionSeq: null,
                  strength: "direct"
                },
                {
                  factPaths: [
                    "execution.reportedCommitted"
                  ],
                  class: "execution-result",
                  producer: "VelaRuntime",
                  contractRevision: "vela-trajectory-source-v1",
                  occurrenceId: "trajectory_occurrence_20",
                  sourceRequestId: null,
                  sourceSessionSeq: null,
                  strength: "reduced"
                },
                {
                  factPaths: [
                    "verification.attemptId",
                    "verification.attempted",
                    "verification.scope"
                  ],
                  class: "local-control-occurrence",
                  producer: "VelaExecutionPreflight",
                  contractRevision: "vela-trajectory-source-v1",
                  occurrenceId: "trajectory_occurrence_21",
                  sourceRequestId: null,
                  sourceSessionSeq: null,
                  strength: "direct"
                },
                {
                  factPaths: [
                    "verification"
                  ],
                  class: "fresh-verify-evidence",
                  producer: "VelaExecutionPreflight",
                  contractRevision: "vela-trajectory-source-v1",
                  occurrenceId: "trajectory_occurrence_22",
                  sourceRequestId: "req_00000000000000000000000000000044",
                  sourceSessionSeq: null,
                  strength: "direct"
                },
                {
                  factPaths: [
                    "completion"
                  ],
                  class: "derived-objective-summary",
                  producer: "VelaAgentDriver",
                  contractRevision: "vela-trajectory-source-v1",
                  occurrenceId: "trajectory_occurrence_23",
                  sourceRequestId: null,
                  sourceSessionSeq: null,
                  strength: "derived"
                }
              ],
              unknowns: [
                {
                  path: "correlation.providerRequestId",
                  reason: "not-wired"
                },
                {
                  path: "target.targetRef",
                  reason: "not-wired"
                },
                {
                  path: "correlation.supersedesAttemptId",
                  reason: "not-observed"
                },
                {
                  path: "execution.resultCode",
                  reason: "not-observed"
                },
                {
                  path: "verification.code",
                  reason: "not-observed"
                }
              ]
            }
          ],
          completion: {
            outcome: "completed",
            code: null,
            coverage: "full",
            declaredStepCount: 2,
            completedStepCount: 2,
            remainingStepCount: 0,
            verifiedEvidenceStepCount: 2,
            sourceAttemptIds: [
              "trajectory_attempt_3",
              "trajectory_attempt_16"
            ]
          },
          provenance: [
            {
              factPaths: [
                "objective"
              ],
              class: "local-control-occurrence",
              producer: "VelaAgentDriver",
              contractRevision: "vela-trajectory-source-v1",
              occurrenceId: "trajectory_occurrence_1",
              sourceRequestId: null,
              sourceSessionSeq: null,
              strength: "direct"
            },
            {
              factPaths: [
                "completion.outcome",
                "completion.completedStepCount",
                "completion.remainingStepCount"
              ],
              class: "derived-objective-summary",
              producer: "VelaAgentDriver",
              contractRevision: "vela-trajectory-source-v1",
              occurrenceId: "trajectory_occurrence_24",
              sourceRequestId: null,
              sourceSessionSeq: null,
              strength: "derived"
            }
          ],
          unknowns: [
            {
              path: "completion.code",
              reason: "not-observed"
            }
          ],
          bounds: {
            complete: true,
            omittedAttemptCount: 0,
            omittedValueCount: 0
          }
        }
      }
    }
  };

  // client/reference/src/vela-projection.js
  function referencePhase(snapshot) {
    const trajectory = snapshot.trajectory.active || snapshot.trajectory.terminal, completion = trajectory?.completion;
    if (snapshot.driver.state === "terminal") {
      if (completion?.completedStepCount > 0 && completion.remainingStepCount > 0) return "partial";
      const outcome = snapshot.driver.terminal?.outcome;
      if (["completed", "rejected", "cancelled"].includes(outcome)) return outcome;
      return "failed";
    }
    if (snapshot.driver.state === "awaiting-review") return "review";
    if (snapshot.driver.state === "awaiting-outcome") return "executing";
    throw new Error("Unmapped Runtime fixture state: " + snapshot.driver.state);
  }

  // client/reference/src/vela.js
  var stateNames = { review: ["Awaiting approval", "待批准"], executing: ["Executing", "执行中"], partial: ["Partially completed", "部分完成"], rejected: ["Rejected", "已拒绝"], cancelled: ["Cancelled", "已取消"], failed: ["Failed", "失败"], completed: ["Completed", "完成"] };
  var name = (cap) => cap === "set-opacity-v1" ? bilingual("Set layer opacity", "调整图层不透明度") : cap === "set-layer-name-v1" ? bilingual("Rename layer", "重命名图层") : cap;
  var value = (v, cap) => v === null || v === void 0 ? "—" : String(v) + (cap === "set-opacity-v1" ? "%" : "");
  var ReferenceVela = class {
    constructor(root2, { state = "review", draft = "", messages = [] } = {}) {
      Object.assign(this, { root: root2, state, draft, messages });
      this.abort = new AbortController();
      this.render();
      const o = { signal: this.abort.signal };
      root2.addEventListener("change", (e) => {
        if (e.target.matches("[data-vela-state]")) {
          this.state = e.target.value;
          this.renderProjection();
        }
      }, o);
      root2.addEventListener("input", (e) => {
        if (e.target.matches("textarea")) {
          this.draft = e.target.value;
          this.layoutComposer();
        }
      }, o);
      root2.addEventListener("compositionstart", () => this.composing = true, o);
      root2.addEventListener("compositionend", () => this.composing = false, o);
      root2.addEventListener("keydown", (e) => {
        if (e.target.matches("textarea") && e.key === "Enter" && (e.ctrlKey || e.metaKey) && !e.isComposing && !this.composing && e.keyCode !== 229) {
          e.preventDefault();
          this.send();
        }
      }, o);
      root2.addEventListener("submit", (e) => {
        e.preventDefault();
        this.send();
      }, o);
      root2.addEventListener("click", (e) => {
        if (e.target.closest("[data-vela-long]")) this.append(bilingual("Additional fixture evidence. ", "新增模拟证据。").repeat(35), false);
        if (e.target.closest("[data-isolated-command]") || e.target.closest("[data-vela-send]") && this.state === "executing") {
          e.preventDefault();
          this.commandStatus(bilingual("Command isolated. Select a captured state to inspect its facts.", "命令已隔离。请用状态选择器查看捕获的事实。"));
          return;
        }
      }, o);
      this.resize = new ResizeObserver(() => this.layoutComposer());
      this.resize.observe(root2.querySelector(".composer"));
      this.resize.observe(root2.querySelector(".vela-shell"));
    }
    render() {
      disposeControls(this.root);
      this.root.innerHTML = `<div class="ref-vela-tools"><label>${esc(t("reference.state"))}<select data-vela-state>${Object.entries(stateNames).map(([key, names]) => `<option value="${key}" ${key === this.state ? "selected" : ""}>${esc(bilingual(...names))}</option>`).join("")}</select></label><button data-vela-long>${esc(bilingual("Append long evidence", "追加长证据"))}</button></div>
  <section class="vela-shell" aria-label="${esc(bilingual("Vela conversation", "Vela 会话"))}"><div class="vela-content-clip"><header class="vela-header"><div class="vela-title">${icon2("vela")}<h3>Vela</h3></div><span class="composition-name">${esc(bilingual("Isolated Runtime fixture", "隔离 Runtime 模拟"))}</span><button class="icon-button" type="button" data-isolated-command="new" aria-label="${esc(t("vela.conversationNew"))}" title="${esc(t("reference.fixture"))}">${icon2("plus")}</button></header>
  <div class="messages ref-transcript" tabindex="0" aria-label="${esc(bilingual("Conversation messages", "会话消息"))}"><div class="message user"><p>把当前图层的不透明度改成 60%，然后把它重命名为 Vela Stream Test</p></div><div class="message turn-assistant"><div class="message-label"><span class="sender">Vela</span><span>·</span><span>${esc(bilingual("Captured state", "捕获状态"))}</span></div><p class="reply-line">${esc(bilingual("Only the current step is reviewed. Completed work remains a fact after rejection or failure.", "批准范围仅限当前步；后续拒绝或失败不会撤销已完成事实。"))}</p><div class="ref-projection phase-detail"></div></div>${this.messages.map((m) => this.messageHTML(m)).join("")}</div></div>
  <div class="composer-haze" aria-hidden="true"><span></span><span></span><span></span><span></span></div><form class="composer" aria-label="${esc(bilingual("Draft · Provider disabled", "起草 · Provider 未启用"))}"><div class="composer-box"><textarea id="ref-draft" rows="1" aria-label="${esc(bilingual("Message Vela", "给 Vela 的消息"))}" placeholder="${esc(bilingual("Ask Vela or describe an edit…", "向 Vela 提问或描述修改……"))}">${esc(this.draft)}</textarea></div><div class="composer-toolbar"><div class="settings-slot"><button class="icon-button settings-button" type="button" data-vela-appearance aria-label="${esc(t("settings.navigation.appearance"))}">${icon2("settings")}</button></div><div class="composer-status" role="status"><span class="status-dot" aria-hidden="true"></span><span class="status-label"></span></div><div class="composer-actions"><button class="secondary-button review-cancel" type="button" data-isolated-command="reject">${esc(bilingual("Reject", "拒绝"))}</button><button class="primary-button" type="button" data-isolated-command="approve">${esc(bilingual("Approve", "批准"))}</button><button class="send-button" type="submit" data-vela-send aria-label="${esc(t("vela.surfaceSend"))}">${icon2("send")}</button></div></div><p class="ref-composer-hint">${esc(bilingual("Enter: new line · Ctrl/Cmd+Enter: fixture send", "Enter 换行 · Ctrl/Cmd+Enter 模拟发送"))}</p><p role="status" data-command-status></p></form></section>`;
      mountControls(this.root);
      this.renderProjection();
      this.layoutComposer();
      this.root.querySelector(".messages").scrollTop = this.root.querySelector(".messages").scrollHeight;
    }
    reviewHTML(r) {
      return `<div class="proposal" data-review-id="${esc(r.reviewId)}"><div class="proposal-header">${esc(name(r.capabilityId))} <span class="panel-status">/ ${esc(bilingual("Review", "审阅"))}</span></div><div class="change-row"><span title="${esc(r.target.layerId)}">${copy("Selected layer")}</span><span><span class="old">${esc(value(r.beforeValue, r.capabilityId))}</span> → <span class="new">${esc(value(r.proposedValue, r.capabilityId))}</span></span></div><p class="proposal-note">${esc(bilingual("Current step", "当前步"))} ${r.stepNumber} / ${r.stepCount} · ${esc(bilingual("Before → proposed", "原值 → 提议值"))}</p><details class="ref-review-identity"><summary>${esc(bilingual("Review identity and target", "Review 身份与目标"))}</summary><dl><dt>${copy("Review ID")}</dt><dd>${esc(r.reviewId)}</dd><dt>${esc(bilingual("Revision / scope", "修订 / 范围"))}</dt><dd>${r.revision} / ${esc(r.approvalScope)}</dd><dt>${esc(bilingual("Composition / layer", "合成 / 图层"))}</dt><dd>${esc(r.target.compId)} / ${esc(r.target.layerId)}</dd></dl></details></div>`;
    }
    renderProjection() {
      const f = vela_fixtures_default[this.state], trajectory = f.trajectory.active || f.trajectory.terminal, logical = f.driver.logicalPlan, phase = referencePhase(f), projection = self.VelaPresentationModel.projectSurfaceState(f.provider, f.confirmation, this.draft, true, "ready"), transcript = this.root.querySelector(".messages");
      this.root.querySelector(".vela-shell").dataset.ui = phase;
      this.root.querySelector(".reply-line").textContent = copy(phase === "review" ? "I can apply this step after your approval." : "Captured execution facts are shown below.");
      this.root.querySelector("textarea").placeholder = phase === "review" ? copy("Review the proposed change above") : bilingual("Ask Vela or describe an edit…", "向 Vela 提问或描述修改……");
      this.root.querySelector(".status-label").textContent = bilingual(...stateNames[phase]);
      const send = this.root.querySelector("[data-vela-send]");
      send.innerHTML = icon2(phase === "executing" ? "stop" : "send");
      send.setAttribute("aria-label", t(phase === "executing" ? "vela.surfaceCancel" : "vela.surfaceSend"));
      for (const el of this.root.querySelectorAll("[data-isolated-command=approve],[data-isolated-command=reject]")) el.hidden = phase !== "review";
      this.root.querySelector("[data-isolated-command=approve]").disabled = !f.confirmation.canApprove;
      preserveReading(transcript, () => {
        const attempts = (trajectory?.attempts || []).filter((a) => a.execution?.executionAttempted || a.execution?.hostCommitted === true || a.completion?.outcome !== "active");
        this.root.querySelector(".ref-projection").innerHTML = `<header class="terminal-label"><span class="ref-state" data-phase="${phase}" data-tone="${projection.tone}">${esc(bilingual(...stateNames[phase]))}</span></header><p class="detail-line">${esc(bilingual("Current step", "当前步"))}: ${(logical?.currentStepIndex ?? 0) + 1} / ${logical?.stepCount ?? 1} · ${esc(bilingual("Completed", "已完成"))}: ${logical?.completedStepCount ?? 0}</p>${f.reviews.map((r) => this.reviewHTML(r)).join("")}${attempts.length ? `<ol class="steps ref-execution-facts">${attempts.map((a, i) => `<li class="${a.completion?.outcome === "completed" ? "done" : "pending"}"><span class="step-icon">${a.completion?.outcome === "completed" ? icon2("check") : a.completion?.outcome === "active" && phase === "executing" ? icon2("loader", "rotation") : String(i + 1)}</span><div><strong>${esc(name(a.capabilityId))}</strong><p class="detail-line">${esc(bilingual("Completion", "完成情况"))}: ${esc(a.completion?.outcome ?? "unknown")} · ${esc(bilingual("Committed", "已提交变更"))}: ${esc(String(a.execution?.hostCommitted ?? "unknown"))}</p><p class="detail-line">Verify: ${esc(a.verification?.disposition ?? "unknown")} · ${esc(a.verification?.scope ?? "unknown")}</p><p class="detail-line">${esc(bilingual("Expected / observed", "期望 / 观察值"))}: ${esc(JSON.stringify(a.verification?.expected?.data ?? null))} / ${esc(JSON.stringify(a.verification?.actual?.data ?? null))}</p></div></li>`).join("")}</ol>` : ""}${phase === "partial" || phase === "failed" ? `<p class="completion-meta">${esc(bilingual("Committed changes remain. No automatic rollback.", "已提交变更保留，不会自动回滚。"))}</p>` : ""}<details class="ref-runtime-detail"><summary>${esc(bilingual("Runtime projection and provenance", "Runtime 投影与证据来源"))}</summary><pre>${esc(JSON.stringify({ surfaceProjection: projection, provider: f.provider, confirmation: f.confirmation, driver: f.driver, trajectory }, null, 2))}</pre></details>`;
      });
      this.layoutComposer();
    }
    layoutComposer() {
      if (!this.root.isConnected) return;
      this.root.querySelector("[data-vela-send]").hidden = referencePhase(vela_fixtures_default[this.state]) === "review" && !this.draft.trim();
      const shell = this.root.querySelector(".vela-shell"), input = shell.querySelector("textarea"), messages = shell.querySelector(".messages");
      preserveReading(messages, () => {
        input.style.height = "24px";
        input.style.height = Math.min(72, Math.max(24, input.scrollHeight)) + "px";
        const height = shell.querySelector(".composer").offsetHeight, clear = shell.clientHeight - shell.querySelector(".vela-header").offsetHeight - height;
        shell.style.setProperty("--composer-height", height + "px");
        shell.style.setProperty("--composer-fade", Math.min(48, Math.max(16, clear - 72)) + "px");
      });
    }
    messageHTML(m) {
      return `<div class="message ${m.user ? "user" : ""}"><p>${esc(m.text ?? m)}</p></div>`;
    }
    append(text2, user = true) {
      const transcript = this.root.querySelector(".messages"), message = { text: text2, user };
      this.messages.push(message);
      preserveReading(transcript, () => transcript.insertAdjacentHTML("beforeend", this.messageHTML(message)));
    }
    commandStatus(text2) {
      this.root.querySelector("[data-command-status]").textContent = text2;
      this.layoutComposer();
    }
    send() {
      if (this.composing || !this.draft.trim()) return;
      this.append(this.draft);
      this.draft = "";
      this.root.querySelector("textarea").value = "";
      this.commandStatus(bilingual("Stored in this fixture conversation only.", "仅加入当前模拟会话。"));
    }
    get dirty() {
      return true;
    }
    save() {
      return true;
    }
    discard() {
      this.draft = "";
      this.messages = [];
    }
    snapshot() {
      return { state: this.state, draft: this.draft, messages: this.messages };
    }
    destroy() {
      this.resize?.disconnect();
      disposeControls(this.root);
      this.abort.abort();
    }
  };

  // client/reference/src/app.js
  var root = document.querySelector("#reference-root");
  var snapshots = {};
  var abort = new AbortController();
  var view = null;
  var route = "registry";
  var variant = "kit";
  var negotiating = false;
  var exited = false;
  var theme = "dark";
  var scale = 0.92;
  var stores = [settingsStore, paletteStore(), curveStore(), assetSettingsStore()];
  var overlay = new OverlayOwner(root);
  var sizeProbe = new SizeProbe(root);
  function projectAppearance() {
    const html = document.documentElement;
    html.dataset.theme = theme;
    for (const property of ["--accent", "--accent-fill", "--on-accent", "--focus-ring", "--tool-fill"]) html.style.removeProperty(property);
    const { accent, fill } = appearanceSelection();
    if (accent?.kind === "solid") for (const [key, value2] of Object.entries(accentTokens(accent.rgb, theme))) html.style.setProperty(key, value2);
    if (fill) html.style.setProperty("--tool-fill", paintCSS(fill));
  }
  function resize() {
    cancelNumberEdits();
    closeSelect();
    if (view?.drag) {
      view instanceof ReferenceCurve ? view.endDrag(false) : view.endDrag(null, true);
    }
    view?.endStop?.(false);
    view?.picker?.endPlane?.(false);
    root.style.zoom = String(scale);
    root.style.width = innerWidth / scale + "px";
    root.style.height = innerHeight / scale + "px";
    root.dataset.paletteWide = String(innerWidth / scale >= 620);
    root.dataset.curveWide = String(innerWidth / scale >= 680);
    root.dataset.registryWide = String(innerWidth / scale >= 800);
    view?.picker?.schedulePosition();
  }
  function status(text2) {
    root.querySelector("[data-reference-status]").textContent = text2;
  }
  function updateStatus() {
    if (exited || !view) return;
    status(t(view.store?.status === "error" ? "reference.failed" : route === "vela" ? "reference.conversationStatus" : view.dirty ? "reference.unsavedStatus" : "reference.saved"));
  }
  function renderShell() {
    sizeProbe.dispose();
    disposeControls(root);
    document.documentElement.lang = locale.value;
    root.innerHTML = `<header class="ref-header"><div><strong>${esc(t("reference.title"))}</strong><span>0.3.13-B</span><button data-exit>${esc(t("reference.exit"))}</button></div><p>${esc(t("reference.fixture"))}</p><details class="ref-setup" ${innerHeight >= 500 ? "open" : ""}><summary>${esc(bilingual("Preview setup", "预览设置"))}</summary><div class="ref-options"><label>${copy("Theme")}<select data-theme><option value="dark">${copy("Dark")}</option><option value="light">${copy("Light")}</option></select></label><label>${copy("Language")}<select data-locale><option value="en">English</option><option value="zh-CN">中文</option></select></label><label>${copy("UI Scale")}<select data-scale>${[0.62, 0.92, 1, 1.18].map((n) => `<option value="${n}" ${n === scale ? "selected" : ""}>${n}</option>`).join("")}</select></label></div><details class="ref-diagnostics"><summary>${copy("Size diagnostics")}</summary><button type="button" data-size-probe>${esc(bilingual("Sample sizes once (4s); then open the picker", "一次尺寸采样（4 秒）；点击后打开颜色弹层"))}</button><details data-size-evidence hidden><summary></summary><textarea readonly aria-label="${esc(bilingual("Size sampling evidence", "尺寸采样证据"))}"></textarea></details></details></details></header><nav class="ref-nav" aria-label="${copy("Reference pages")}">${[["registry", "Registry"], ["settings", copy("Global Settings")], ["vela", "Vela"], ["palette", copy("Palette / Curve")]].map(([id, label2]) => `<button data-route="${id}">${label2}</button>`).join("")}</nav><div class="ref-subnav"></div><section class="ref-page"></section><footer class="ref-save"><div><button data-save>${esc(t("reference.save"))}</button><label><input type="checkbox" data-failure>${esc(t("reference.failSave"))}</label></div><span data-reference-status role="status">${esc(t("reference.saved"))}</span></footer>`;
    root.querySelector("[data-theme]").value = theme;
    root.querySelector("[data-locale]").value = locale.value;
    mountControls(root);
    resize();
  }
  function mount() {
    const page = root.querySelector(".ref-page"), sub = root.querySelector(".ref-subnav");
    page.className = "ref-page";
    root.querySelectorAll("[data-route]").forEach((b) => b.setAttribute("aria-current", b.dataset.route === route ? "page" : "false"));
    sub.innerHTML = route === "registry" ? `<button data-variant="kit">${esc(label(REGISTRY_SCHEMAS.kit, REGISTRY_SCHEMAS.kit.titleKey, locale.value))}</button><button data-variant="controls">${copy("Registry Controls")}</button><label><input data-action-error type="checkbox">${esc(bilingual("Action failure fixture", "动作失败模拟"))}</label>` : route === "palette" ? `<button data-variant="palette">${copy("Palette")}</button><button data-variant="curve">${copy("Curve")}</button><small>${esc(bilingual("Lab paint model · Palette v2 adapter pending; session data only", "Lab Paint 模型 · Palette v2 适配待完成；仅会话内数据"))}</small>` : route === "settings" ? `<button data-reset>${esc(t("reference.reset"))}</button><small>${esc(bilingual("Actual Appearance / Design Tuning definitions · isolated preview", "实际 Appearance / Design Tuning 定义 · 隔离预览"))}</small>` : "";
    if (route === "registry") {
      page.classList.add("registry-root");
      view = new ReferenceRegistry(page, variant, { saved: snapshots[variant], sessionKey: "reference-" + variant });
      const run = view.session.run.bind(view.session);
      view.session.run = (key) => {
        if (root.querySelector("[data-action-error]")?.checked) return view.session.lastResult = { ok: false, preview: true, action: key, error: "FIXTURE_ACTION_FAILED" };
        return run(key);
      };
    }
    if (route === "settings") {
      page.classList.add("registry-root");
      view = new SettingsView(page);
    }
    if (route === "palette") {
      page.classList.add(variant === "curve" ? "curve-root" : "palette-root");
      view = variant === "curve" ? new ReferenceCurve(page, snapshots.curve) : new ReferencePalette(page, snapshots.palette);
    }
    if (route === "vela") {
      page.classList.add("reference-vela");
      view = new ReferenceVela(page, snapshots.vela);
    }
    if (view.ui?.lang !== void 0) {
      view.ui.lang = locale.value;
      view.render();
    }
    sub.querySelectorAll("[data-variant]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.variant === variant)));
    resize();
    updateStatus();
  }
  async function negotiate() {
    if (negotiating) return false;
    cancelNumberEdits();
    closeSelect();
    if (view instanceof ReferenceRegistry) view.endDrag(null, true);
    if (view instanceof ReferencePalette) view.endStop(false);
    if (view instanceof ReferenceCurve) view.endDrag(false);
    if (!view.dirty) return true;
    negotiating = true;
    const conversation = route === "vela", choices = [["stay", t("reference.stay")], ["discard", t("reference.discard")]];
    if (!conversation && !view.picker) choices.push(["save", t("reference.save")]);
    const answer = await overlay.ask(t(conversation ? "reference.conversation" : "reference.unsaved"), choices);
    negotiating = false;
    if (answer === "stay") return false;
    if (answer === "discard") {
      view.discard();
      return true;
    }
    const saved = view.save();
    status(t(saved ? "reference.saved" : "reference.failed"));
    return saved;
  }
  function disposeView() {
    if (view?.snapshot) snapshots[route === "vela" ? "vela" : variant] = view.snapshot();
    view?.destroy();
    view = null;
  }
  async function navigate(next, nextVariant) {
    if (!await negotiate()) return;
    disposeView();
    route = next;
    variant = nextVariant || (next === "registry" ? "kit" : "palette");
    mount();
  }
  async function exit() {
    if (exited || !await negotiate()) return;
    disposeView();
    sizeProbe.dispose();
    disposeControls(root);
    overlay.dispose();
    unobserve();
    disposeAssets();
    stores.forEach((s) => s.dispose());
    abort.abort();
    exited = true;
    root.innerHTML = `<div class="ref-exited"><h1>${esc(bilingual("Reference closed", "参考页已关闭"))}</h1><p>${esc(bilingual("Session fixtures disposed. Close this standalone window or return to Settings.", "会话模拟实例已释放。请关闭独立窗口或返回设置页。"))}</p></div>`;
    if (parent !== window) parent.postMessage({ type: "lomond-reference-exit" }, "*");
  }
  renderShell();
  mount();
  projectAppearance();
  initAssets();
  var unobserve = observeAssets(projectAppearance);
  stores.forEach((s) => s.subscribe(updateStatus));
  for (const type of ["input", "focusout", "pointerup", "pointercancel"]) root.addEventListener(type, updateStatus, { signal: abort.signal });
  root.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.route && b.dataset.route !== route) navigate(b.dataset.route);
    if (b.dataset.variant && b.dataset.variant !== variant) navigate(route, b.dataset.variant);
    if (b.hasAttribute("data-vela-appearance")) {
      root.querySelector(".ref-setup").open = true;
      root.querySelector("[data-theme]").parentElement.querySelector(".select-trigger").focus();
    }
    if (b.hasAttribute("data-size-probe")) sizeProbe.start();
    if (b.hasAttribute("data-exit")) exit();
    if (b.hasAttribute("data-save")) {
      if (view.picker || view.drag || view.stopDrag) {
        status(bilingual("Apply or cancel the active edit first.", "请先应用或取消当前编辑。"));
        return;
      }
      status(t(view.save() ? "reference.saved" : "reference.failed"));
    }
    if (b.hasAttribute("data-reset")) view.reset();
  }, { signal: abort.signal });
  root.addEventListener("change", async (e) => {
    const el = e.target;
    if (el.hasAttribute("data-theme")) {
      theme = el.value;
      projectAppearance();
    }
    if (el.hasAttribute("data-scale")) {
      scale = Number(el.value);
      resize();
    }
    if (el.hasAttribute("data-failure")) stores.forEach((s) => s.failSave = el.checked);
    if (el.hasAttribute("data-locale")) {
      const next = el.value;
      if (await negotiate()) {
        disposeView();
        locale.value = next;
        renderShell();
        mount();
      } else el.value = locale.value;
    }
  }, { signal: abort.signal });
  window.addEventListener("resize", resize, { signal: abort.signal });
  window.addEventListener("message", (e) => {
    if (e.source === parent && e.data?.type === "lomond-reference-request-exit") exit();
  }, { signal: abort.signal });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !e.defaultPrevented && !overlay.current) {
      if (closeSelect()) {
        e.preventDefault();
        return;
      }
      if (view?.picker) {
        view.closePicker();
        e.preventDefault();
      } else if (view?.drag || view?.stopDrag) {
        view instanceof ReferencePalette ? view.endStop(false) : view instanceof ReferenceCurve ? view.endDrag(false) : view.endDrag(null, true);
        e.preventDefault();
      } else {
        e.preventDefault();
        exit();
      }
    }
  }, { signal: abort.signal });
  Object.defineProperty(window, "ReferenceState", { value: () => ({ route, variant, exited, dirty: view?.dirty || false, gesture: !!(view?.drag || view?.stopDrag), values: view?.session?.snapshot(), palette: JSON.parse(JSON.stringify(paletteStore().data)), curve: JSON.parse(JSON.stringify(curveStore().data)), subscriptions: stores.map((s) => s.listeners.size) }) });
  if (parent !== window) parent.postMessage({ type: "lomond-reference-ready" }, "*");
})();
