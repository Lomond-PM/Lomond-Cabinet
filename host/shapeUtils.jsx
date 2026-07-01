var AEToolbox = AEToolbox || {};

(function () {
    AEToolbox.Shape = {
        addVectorItem: function (parent, matchName, name) {
            try {
                var item = parent.addProperty(matchName);
                item.name = name;
                return item;
            } catch (e) {
                return null;
            }
        }
    };
})();

