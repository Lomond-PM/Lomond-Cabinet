// Frozen A09-M1c inputs: actual D0 A1 expression text and pre-M1c V1 builders.
// Node fixtures prove text/ownership only; they are not an AE expression engine.
const candidate = {
  "sourcePositionA": "var ctrl=parent;\nvar refs=[thisComp.layer(\"A09_M1B_TEXT_A\"),thisComp.layer(\"A09_M1B_TEXT_B\")];\nvar itemIndex=0;\nvar gap=ctrl.effect(\"Gap\")(1),py=ctrl.effect(\"Padding Y\")(1);\nfunction geometry(l){\n var r=l.sourceRectAtTime(time,false),s=l.transform.scale,a=l.transform.anchorPoint,z=l.transform.rotation*Math.PI/180;\n var c=Math.cos(z),n=Math.sin(z),w=r.width*s[0]/100,h=r.height*s[1]/100;\n var x=(r.left+r.width/2-a[0])*s[0]/100,y=(r.top+r.height/2-a[1])*s[1]/100;\n return {height:Math.abs(w*n)+Math.abs(h*c),offset:[c*x-n*y,n*x+c*y]};\n}\nvar total=gap*(refs.length-1),preceding=0,own;\nfor(var i=0;i<refs.length;i++){var g=geometry(refs[i]),h=g.height+2*py;total+=h;if(i<itemIndex)preceding+=h+gap;if(i===itemIndex)own=g;}\n[-own.offset[0],-total/2+preceding+(own.height+2*py)/2-own.offset[1]];",
  "sourcePositionB": "var ctrl=parent;\nvar refs=[thisComp.layer(\"A09_M1B_TEXT_A\"),thisComp.layer(\"A09_M1B_TEXT_B\")];\nvar itemIndex=1;\nvar gap=ctrl.effect(\"Gap\")(1),py=ctrl.effect(\"Padding Y\")(1);\nfunction geometry(l){\n var r=l.sourceRectAtTime(time,false),s=l.transform.scale,a=l.transform.anchorPoint,z=l.transform.rotation*Math.PI/180;\n var c=Math.cos(z),n=Math.sin(z),w=r.width*s[0]/100,h=r.height*s[1]/100;\n var x=(r.left+r.width/2-a[0])*s[0]/100,y=(r.top+r.height/2-a[1])*s[1]/100;\n return {height:Math.abs(w*n)+Math.abs(h*c),offset:[c*x-n*y,n*x+c*y]};\n}\nvar total=gap*(refs.length-1),preceding=0,own;\nfor(var i=0;i<refs.length;i++){var g=geometry(refs[i]),h=g.height+2*py;total+=h;if(i<itemIndex)preceding+=h+gap;if(i===itemIndex)own=g;}\n[-own.offset[0],-total/2+preceding+(own.height+2*py)/2-own.offset[1]];",
  "backgroundPosition": "var txt=parent;\nvar ctrl=txt.parent;\nvar r=txt.sourceRectAtTime(time,false);\nvar q=[txt.toComp([r.left,r.top]),txt.toComp([r.left+r.width,r.top]),txt.toComp([r.left+r.width,r.top+r.height]),txt.toComp([r.left,r.top+r.height])];\nvar left=q[0][0],right=left,top=q[0][1],bottom=top;\nfor(var i=1;i<4;i++){left=Math.min(left,q[i][0]);right=Math.max(right,q[i][0]);top=Math.min(top,q[i][1]);bottom=Math.max(bottom,q[i][1]);}\nvar center=[(left+right)/2,(top+bottom)/2];\nvar p=txt.fromComp(center);\n[p[0],p[1]];",
  "rectSize": "var txt=parent;\nvar ctrl=txt.parent;\nvar r=txt.sourceRectAtTime(time,false);\nvar q=[txt.toComp([r.left,r.top]),txt.toComp([r.left+r.width,r.top]),txt.toComp([r.left+r.width,r.top+r.height]),txt.toComp([r.left,r.top+r.height])];\nvar left=q[0][0],right=left,top=q[0][1],bottom=top;\nfor(var i=1;i<4;i++){left=Math.min(left,q[i][0]);right=Math.max(right,q[i][0]);top=Math.min(top,q[i][1]);bottom=Math.max(bottom,q[i][1]);}\nvar px=ctrl.effect(\"Padding X\")(1),py=ctrl.effect(\"Padding Y\")(1);\nleft-=px;right+=px;top-=py;bottom+=py;\nvar p=[thisLayer.fromComp([left,top]),thisLayer.fromComp([right,top]),thisLayer.fromComp([right,bottom]),thisLayer.fromComp([left,bottom])];\nvar x0=p[0][0],x1=x0,y0=p[0][1],y1=y0;\nfor(var j=1;j<4;j++){x0=Math.min(x0,p[j][0]);x1=Math.max(x1,p[j][0]);y0=Math.min(y0,p[j][1]);y1=Math.max(y1,p[j][1]);}\n[x1-x0,y1-y0];",
  "roundness": "var txt = thisLayer.parent;\nvar ctrl = txt ? txt.parent : null;\nif (!ctrl && thisLayer.parent) { ctrl = thisLayer.parent; }\nctrl ? ctrl.effect(\"Corner Radius\")(1) : value;",
  "fillColor": "var txt = thisLayer.parent;\nvar ctrl = txt ? txt.parent : null;\nif (!ctrl && thisLayer.parent) { ctrl = thisLayer.parent; }\nctrl ? ctrl.effect(\"Fill Color\")(1) : value;"
};
function legacySource(refs, itemIndex) {
        return [
            "var ctrl = parent;",
            "if (ctrl) {",
            "  var refs = " + refs + ";",
            "  var itemIndex = " + itemIndex + ";",
            "  function layerFromRef(ref) {",
            "    try {",
            "      var byIndex = thisComp.layer(ref.i);",
            "      if (byIndex && byIndex.name == ref.n) { return byIndex; }",
            "    } catch (e1) {}",
            "    try { return thisComp.layer(ref.n); } catch (e2) {}",
            "    return null;",
            "  }",
            "  var gap = ctrl.effect(\"Gap\")(1);",
            "  var px = ctrl.effect(\"Padding X\")(1);",
            "  var py = ctrl.effect(\"Padding Y\")(1);",
            "  var fixedW = ctrl.effect(\"Fixed Width\")(1);",
            "  var mode = Math.round(ctrl.effect(\"Pill Width Mode\")(1));",
            "  var align = Math.round(ctrl.effect(\"Text Align\")(1));",
            "  function rectForLayer(l) {",
            "    if (!l) { return {left:0, top:0, width:0, height:0}; }",
            "    return l.sourceRectAtTime(time, false);",
            "  }",
            "  function scaleForLayer(l, axis) {",
            "    try {",
            "      var s = Math.abs(l.transform.scale[axis]) / 100;",
            "      return s > 0.0001 ? s : 1;",
            "    } catch (e) {",
            "      return 1;",
            "    }",
            "  }",
            "  function pillHeightForLayer(l) {",
            "    var r = rectForLayer(l);",
            "    var sy = scaleForLayer(l, 1);",
            "    return Math.max(0, r.height * sy + py * 2);",
            "  }",
            "  var totalH = 0;",
            "  for (var i = 0; i < refs.length; i++) {",
            "    totalH += pillHeightForLayer(layerFromRef(refs[i]));",
            "    if (i > 0) { totalH += gap; }",
            "  }",
            "  var y = -totalH / 2;",
            "  for (var j = 0; j < itemIndex; j++) {",
            "    y += pillHeightForLayer(layerFromRef(refs[j])) + gap;",
            "  }",
            "  var ownRect = rectForLayer(thisLayer);",
            "  var ownScaleX = scaleForLayer(thisLayer, 0);",
            "  var ownScaleY = scaleForLayer(thisLayer, 1);",
            "  var ownTextW = ownRect.width * ownScaleX;",
            "  var ownH = Math.max(0, ownRect.height * ownScaleY + py * 2);",
            "  var ownW = (mode == 1) ? fixedW : ownTextW + px * 2;",
            "  y += ownH / 2;",
            "  var x = 0;",
            "  if (align == 0) {",
            "    x = -ownW / 2 + px + ownTextW / 2;",
            "  }",
            "  [x, y];",
            "} else {",
            "  value;",
            "}"
        ].join("\n");
    }
function legacyPills() {
        var positionExpression, sizeExpression, roundExpression, colorExpression;
        positionExpression = [
            "var txt = thisLayer.parent;",
            "var ctrl = txt ? txt.parent : null;",
            "if (txt && ctrl && txt.sourceRectAtTime) {",
            "  txt.fromComp(ctrl.toComp([0, txt.position[1]]));",
            "} else {",
            "  value;",
            "}"
        ].join("\n");

        sizeExpression = [
            "var txt = thisLayer.parent;",
            "var ctrl = txt ? txt.parent : null;",
            "if (!ctrl && thisLayer.parent) { ctrl = thisLayer.parent; }",
            "if (txt && ctrl && txt.sourceRectAtTime) {",
            "  var r = txt.sourceRectAtTime(time, false);",
            "  var px = ctrl.effect(\"Padding X\")(1);",
            "  var py = ctrl.effect(\"Padding Y\")(1);",
            "  var fixedW = ctrl.effect(\"Fixed Width\")(1);",
            "  var mode = Math.round(ctrl.effect(\"Pill Width Mode\")(1));",
            "  function scaleForLayer(l, axis) {",
            "    try {",
            "      var s = Math.abs(l.transform.scale[axis]) / 100;",
            "      return s > 0.0001 ? s : 1;",
            "    } catch (e) {",
            "      return 1;",
            "    }",
            "  }",
            "  var sx = scaleForLayer(txt, 0);",
            "  var sy = scaleForLayer(txt, 1);",
            "  var w = (mode == 1) ? fixedW : r.width * sx + px * 2;",
            "  var h = r.height * sy + py * 2;",
            "  [Math.max(0, w / sx), Math.max(0, h / sy)];",
            "} else {",
            "  value;",
            "}"
        ].join("\n");

        roundExpression = [
            "var txt = thisLayer.parent;",
            "var ctrl = txt ? txt.parent : null;",
            "if (!ctrl && thisLayer.parent) { ctrl = thisLayer.parent; }",
            "ctrl ? ctrl.effect(\"Corner Radius\")(1) : value;"
        ].join("\n");

        colorExpression = [
            "var txt = thisLayer.parent;",
            "var ctrl = txt ? txt.parent : null;",
            "if (!ctrl && thisLayer.parent) { ctrl = thisLayer.parent; }",
            "ctrl ? ctrl.effect(\"Fill Color\")(1) : value;"
        ].join("\n");

        return [positionExpression, sizeExpression, roundExpression, colorExpression];
    }
module.exports = {candidate, legacySource, legacyPills};
