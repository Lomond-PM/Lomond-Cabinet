var AEToolbox = AEToolbox || {};

(function () {
    var U = AEToolbox.Util;
    var MN = AEToolbox.MN;

    AEToolbox.Effects = {
        addSlider: function (layer, name, value) {
            var fx = U.prop(layer, MN.EFFECTS);
            var e = fx.addProperty("ADBE Slider Control");
            e.name = name;
            var p = e.property(1);
            U.setValueSafe(p, value);
            return p;
        },

        addColor: function (layer, name, value) {
            var fx = U.prop(layer, MN.EFFECTS);
            var e = fx.addProperty("ADBE Color Control");
            e.name = name;
            var p = e.property(1);
            U.setColorSafe(p, value);
            return p;
        },

        addPoint: function (layer, name, value) {
            var fx = U.prop(layer, MN.EFFECTS);
            var e = fx.addProperty("ADBE Point Control");
            e.name = name;
            var p = e.property(1);
            U.setValueSafe(p, value);
            return p;
        }
    };
})();

