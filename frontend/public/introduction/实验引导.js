(function (cjs, an) {

var p; // shortcut to reference prototypes
var lib={};var ss={};var img={};
lib.ssMetadata = [
		{name:"实验引导_atlas_1", frames: [[1081,500,506,212],[0,348,535,420],[0,0,1093,346],[537,348,542,212],[0,770,1388,118],[1095,0,542,252],[1095,254,506,244],[537,562,298,140],[1390,714,298,140],[837,562,200,200]]}
];


(lib.AnMovieClip = function(){
	this.actionFrames = [];
	this.ignorePause = false;
	this.gotoAndPlay = function(positionOrLabel){
		cjs.MovieClip.prototype.gotoAndPlay.call(this,positionOrLabel);
	}
	this.play = function(){
		cjs.MovieClip.prototype.play.call(this);
	}
	this.gotoAndStop = function(positionOrLabel){
		cjs.MovieClip.prototype.gotoAndStop.call(this,positionOrLabel);
	}
	this.stop = function(){
		cjs.MovieClip.prototype.stop.call(this);
	}
}).prototype = p = new cjs.MovieClip();
// symbols:



(lib.CachedBmp_8 = function() {
	this.initialize(ss["实验引导_atlas_1"]);
	this.gotoAndStop(0);
}).prototype = p = new cjs.Sprite();



(lib.CachedBmp_7 = function() {
	this.initialize(ss["实验引导_atlas_1"]);
	this.gotoAndStop(1);
}).prototype = p = new cjs.Sprite();



(lib.CachedBmp_6 = function() {
	this.initialize(ss["实验引导_atlas_1"]);
	this.gotoAndStop(2);
}).prototype = p = new cjs.Sprite();



(lib.CachedBmp_5 = function() {
	this.initialize(img.CachedBmp_5);
}).prototype = p = new cjs.Bitmap();
p.nominalBounds = new cjs.Rectangle(0,0,5120,2614);


(lib.CachedBmp_4 = function() {
	this.initialize(ss["实验引导_atlas_1"]);
	this.gotoAndStop(3);
}).prototype = p = new cjs.Sprite();



(lib.CachedBmp_3 = function() {
	this.initialize(ss["实验引导_atlas_1"]);
	this.gotoAndStop(4);
}).prototype = p = new cjs.Sprite();



(lib.CachedBmp_2 = function() {
	this.initialize(ss["实验引导_atlas_1"]);
	this.gotoAndStop(5);
}).prototype = p = new cjs.Sprite();



(lib.CachedBmp_1 = function() {
	this.initialize(ss["实验引导_atlas_1"]);
	this.gotoAndStop(6);
}).prototype = p = new cjs.Sprite();



(lib.下一步 = function() {
	this.initialize(ss["实验引导_atlas_1"]);
	this.gotoAndStop(7);
}).prototype = p = new cjs.Sprite();



(lib.我知道了 = function() {
	this.initialize(ss["实验引导_atlas_1"]);
	this.gotoAndStop(8);
}).prototype = p = new cjs.Sprite();



(lib.AI助手 = function() {
	this.initialize(img.AI助手);
}).prototype = p = new cjs.Bitmap();
p.nominalBounds = new cjs.Rectangle(0,0,2549,1320);


(lib.学习目标 = function() {
	this.initialize(img.学习目标);
}).prototype = p = new cjs.Bitmap();
p.nominalBounds = new cjs.Rectangle(0,0,2549,1329);


(lib.实验引导_1 = function() {
	this.initialize(img.实验引导_1);
}).prototype = p = new cjs.Bitmap();
p.nominalBounds = new cjs.Rectangle(0,0,2549,1320);


(lib.箭头 = function() {
	this.initialize(ss["实验引导_atlas_1"]);
	this.gotoAndStop(9);
}).prototype = p = new cjs.Sprite();
// helper functions:

function mc_symbol_clone() {
	var clone = this._cloneProps(new this.constructor(this.mode, this.startPosition, this.loop, this.reversed));
	clone.gotoAndStop(this.currentFrame);
	clone.paused = this.paused;
	clone.framerate = this.framerate;
	return clone;
}

function getMCSymbolPrototype(symbol, nominalBounds, frameBounds) {
	var prototype = cjs.extend(symbol, cjs.MovieClip);
	prototype.clone = mc_symbol_clone;
	prototype.nominalBounds = nominalBounds;
	prototype.frameBounds = frameBounds;
	return prototype;
	}


(lib.完成学习 = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	// 图层_1
	this.instance = new lib.我知道了();

	this.instance_1 = new lib.下一步();

	this.instance_2 = new lib.下一步();
	this.instance_2.setTransform(-12,-6,1.0805,1.0805);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance_1,p:{scaleX:1,scaleY:1,x:0,y:0}},{t:this.instance,p:{scaleX:1,scaleY:1,x:0,y:0}}]}).to({state:[{t:this.instance_2,p:{scaleX:1.0805,scaleY:1.0805,x:-12,y:-6}},{t:this.instance_1,p:{scaleX:1.0805,scaleY:1.0757,x:-12,y:-5}},{t:this.instance,p:{scaleX:1.0805,scaleY:1.0757,x:-12,y:-5}}]},1).to({state:[{t:this.instance_2,p:{scaleX:0.9571,scaleY:0.9571,x:6,y:3}},{t:this.instance_1,p:{scaleX:0.948,scaleY:0.9428,x:9,y:5}},{t:this.instance,p:{scaleX:0.948,scaleY:0.9428,x:9,y:5}}]},1).to({state:[{t:this.instance_1,p:{scaleX:1,scaleY:1,x:0,y:0}}]},1).wait(1));

	this._renderFirstFrame();

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-12,-6,322,151.6);


(lib.补间3 = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	// 图层_1
	this.instance = new lib.箭头();
	this.instance.setTransform(-100,-100);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(1));

	this._renderFirstFrame();

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-100,-100,200,200);


(lib.补间2 = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	// 图层_1
	this.instance = new lib.箭头();
	this.instance.setTransform(-100,-100);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(1));

	this._renderFirstFrame();

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-100,-100,200,200);


(lib.补间1 = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	// 图层_1
	this.instance = new lib.箭头();
	this.instance.setTransform(-100,-100);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(1));

	this._renderFirstFrame();

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-100,-100,200,200);


(lib.下一步_1 = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	// 图层_1
	this.instance = new lib.下一步();

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(1).to({scaleX:1.0805,scaleY:1.0805,x:-12,y:-6},0).wait(1).to({scaleX:0.9571,scaleY:0.9571,x:6,y:3},0).wait(1).to({scaleX:1,scaleY:1,x:0,y:0},0).wait(1));

	this._renderFirstFrame();

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-12,-6,322,151.3);


(lib.箭头_1 = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	// 图层_1
	this.instance = new lib.补间1("synched",0);
	this.instance.setTransform(100,100);

	this.instance_1 = new lib.补间2("synched",0);
	this.instance_1.setTransform(100,161);
	this.instance_1._off = true;

	this.instance_2 = new lib.补间3("synched",0);
	this.instance_2.setTransform(100,100);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance}]}).to({state:[{t:this.instance_1}]},4).to({state:[{t:this.instance_2}]},4).wait(1));
	this.timeline.addTween(cjs.Tween.get(this.instance).to({_off:true,y:161},4).wait(5));
	this.timeline.addTween(cjs.Tween.get(this.instance_1).to({_off:false},4).to({_off:true,y:100},4).wait(1));

	this._renderFirstFrame();

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,200,261);


(lib.步骤四 = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	this.isSingleFrame = false;
	// timeline functions:
	this.frame_0 = function() {
		if(this.isSingleFrame) {
			return;
		}
		if(this.totalFrames == 1) {
			this.isSingleFrame = true;
		}
		button = this.button4;
		root = this;
		
		button.addEventListener("click", jumpToFrame);
		
		function jumpToFrame() {
		    root.parent.gotoAndStop(4); 
		}
	}

	// actions tween:
	this.timeline.addTween(cjs.Tween.get(this).call(this.frame_0).wait(1));

	// 文字_箭头
	this.button4 = new lib.下一步_1();
	this.button4.name = "button4";
	this.button4.setTransform(965.1,110.55,0.6919,0.6919);
	new cjs.ButtonHelper(this.button4, 0, 1, 2, false, new lib.下一步_1(), 3);

	this.instance = new lib.箭头_1();
	this.instance.setTransform(1108.6,-75.8,0.5499,0.5499,-90,0,0,100.5,100.2);

	this.instance_1 = new lib.CachedBmp_8();
	this.instance_1.setTransform(936.85,-15.65,0.5,0.5);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance_1},{t:this.instance},{t:this.button4}]}).wait(1));

	// 阴影
	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("#0099FF").ss(12,1,1).p("AG/W4It8AAMAAAgtvIN8AA");
	this.shape.setTransform(1235.35,-1.175);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("rgba(0,0,0,0.447)").s().p("EjH/BmHMAAAjMNMGP/AAAMAAABPJIt9AAMAAAAtuIN9AAMAAABPWg");
	this.shape_1.setTransform(0,-0.5);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_1},{t:this.shape}]}).wait(1));

	// 背景
	this.instance_2 = new lib.实验引导_1();
	this.instance_2.setTransform(-1280,-654,1.0043,0.9902);

	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(1));

	// 阴影_复制
	this.shape_2 = new cjs.Shape();
	this.shape_2.graphics.f("rgba(0,0,0,0.447)").s().p("EjH/BmHMAAAjMNMGP/AAAMAAADMNg");
	this.shape_2.setTransform(0,-0.5);

	this.timeline.addTween(cjs.Tween.get(this.shape_2).wait(1));

	this._renderFirstFrame();

}).prototype = getMCSymbolPrototype(lib.步骤四, new cjs.Rectangle(-1280,-654,2566,1307), null);


(lib.步骤五 = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	this.isSingleFrame = false;
	// timeline functions:
	this.frame_0 = function() {
		if(this.isSingleFrame) {
			return;
		}
		if(this.totalFrames == 1) {
			this.isSingleFrame = true;
		}
		button = this.button5;
		root = this;
		
		button.addEventListener("click", jumpToFrame);
		
		function jumpToFrame() {
		    root.parent.gotoAndStop(5); 
		}
	}

	// actions tween:
	this.timeline.addTween(cjs.Tween.get(this).call(this.frame_0).wait(1));

	// 文字_箭头
	this.button5 = new lib.下一步_1();
	this.button5.name = "button5";
	this.button5.setTransform(433.95,61.65,0.6919,0.6919);
	new cjs.ButtonHelper(this.button5, 0, 1, 2, false, new lib.下一步_1(), 3);

	this.instance = new lib.箭头_1();
	this.instance.setTransform(756.7,-68.6,0.5499,0.5499,-90,0,0,100.5,100.2);

	this.instance_1 = new lib.CachedBmp_7();
	this.instance_1.setTransform(433.95,-181.35,0.5,0.5);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance_1},{t:this.instance},{t:this.button5}]}).wait(1));

	// 阴影
	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("#0099FF").ss(12,1,1).p("EAhYAnaMhCvAAAMAAAhOzMBCvAAA");
	this.shape.setTransform(1066.425,-7.625);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("rgba(0,0,0,0.447)").s().p("EjH/BmHMAAAjMNMGP/AAAMAAAA9mMhCwAAAMAAABOyMBCwAAAMAAAA/1g");
	this.shape_1.setTransform(0,-0.5);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_1},{t:this.shape}]}).wait(1));

	// 背景
	this.instance_2 = new lib.学习目标();
	this.instance_2.setTransform(-1280,-654,1.0043,0.9865);

	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(1));

	// 阴影_复制
	this.shape_2 = new cjs.Shape();
	this.shape_2.graphics.f("rgba(0,0,0,0.447)").s().p("EjH/BmHMAAAjMNMGP/AAAMAAADMNg");
	this.shape_2.setTransform(0,-0.5);

	this.timeline.addTween(cjs.Tween.get(this.shape_2).wait(1));

	this._renderFirstFrame();

}).prototype = getMCSymbolPrototype(lib.步骤五, new cjs.Rectangle(-1280,-654,2566,1311), null);


(lib.步骤二 = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	this.isSingleFrame = false;
	// timeline functions:
	this.frame_0 = function() {
		if(this.isSingleFrame) {
			return;
		}
		if(this.totalFrames == 1) {
			this.isSingleFrame = true;
		}
		button = this.button2;
		root = this;
		
		button.addEventListener("click", jumpToFrame);
		
		function jumpToFrame() {
		    root.parent.gotoAndStop(2); 
		}
	}

	// actions tween:
	this.timeline.addTween(cjs.Tween.get(this).call(this.frame_0).wait(1));

	// 阴影
	this.button2 = new lib.下一步_1();
	this.button2.name = "button2";
	this.button2.setTransform(-787.1,76.25,0.6919,0.6919,0,0,0,149,69.7);
	new cjs.ButtonHelper(this.button2, 0, 1, 2, false, new lib.下一步_1(), 3);

	this.instance = new lib.CachedBmp_6();
	this.instance.setTransform(-992.5,-178.15,0.5,0.5);

	this.instance_1 = new lib.箭头_1();
	this.instance_1.setTransform(-926.1,-272.05,0.664,0.664,90,0,0,100.1,100);

	this.instance_2 = new lib.CachedBmp_5();
	this.instance_2.setTransform(-1280,-654,0.5,0.5);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance_2},{t:this.instance_1},{t:this.instance},{t:this.button2}]}).wait(1));

	// 图层_1
	this.instance_3 = new lib.实验引导_1();
	this.instance_3.setTransform(-1280,-654,1.0043,0.9902);

	this.timeline.addTween(cjs.Tween.get(this.instance_3).wait(1));

	// 阴影_复制
	this.shape = new cjs.Shape();
	this.shape.graphics.f("rgba(0,0,0,0.447)").s().p("EjH/BmHMAAAjMNMGP/AAAMAAADMNg");
	this.shape.setTransform(0,-0.5);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

	this._renderFirstFrame();

}).prototype = getMCSymbolPrototype(lib.步骤二, new cjs.Rectangle(-1280,-654,2560,1307), null);


(lib.步骤六 = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	this.isSingleFrame = false;
	// timeline functions:
	this.frame_0 = function() {
		if(this.isSingleFrame) {
			return;
		}
		if(this.totalFrames == 1) {
			this.isSingleFrame = true;
		}
		button = this.button6;
		root = this;
		
		button.addEventListener("click", jumpToFrame);
		
		function jumpToFrame() {
		    root.parent.gotoAndStop(6); 
		}
	}

	// actions tween:
	this.timeline.addTween(cjs.Tween.get(this).call(this.frame_0).wait(1));

	// 文字_箭头
	this.button6 = new lib.下一步_1();
	this.button6.name = "button6";
	this.button6.setTransform(518.95,536.1,0.6919,0.6919);
	new cjs.ButtonHelper(this.button6, 0, 1, 2, false, new lib.下一步_1(), 3);

	this.instance = new lib.箭头_1();
	this.instance.setTransform(1082.9,597.75,0.5499,0.5499,-90,0,0,100.5,100.2);

	this.instance_1 = new lib.CachedBmp_4();
	this.instance_1.setTransform(764.85,526.95,0.5,0.5);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance_1},{t:this.instance},{t:this.button6}]}).wait(1));

	// 阴影
	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("#0099FF").ss(12,1,1).p("AIzLQIxmAAIAA2fIRmAA");
	this.shape.setTransform(1223.65,574.85);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("rgba(0,0,0,0.447)").s().p("EjH/BmHMAAAjMNMGP/AAAMAAAC0vIxnAAIAAWgIRnAAIAAA+g");
	this.shape_1.setTransform(0,-0.5);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_1},{t:this.shape}]}).wait(1));

	// 背景
	this.instance_2 = new lib.实验引导_1();
	this.instance_2.setTransform(-1280,-654,1.0043,0.9902);

	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(1));

	// 阴影_复制
	this.shape_2 = new cjs.Shape();
	this.shape_2.graphics.f("rgba(0,0,0,0.447)").s().p("EjH/BmHMAAAjMNMGP/AAAMAAADMNg");
	this.shape_2.setTransform(0,-0.5);

	this.timeline.addTween(cjs.Tween.get(this.shape_2).wait(1));

	this._renderFirstFrame();

}).prototype = getMCSymbolPrototype(lib.步骤六, new cjs.Rectangle(-1280,-654,2566,1307), null);


(lib.步骤三 = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	this.isSingleFrame = false;
	// timeline functions:
	this.frame_0 = function() {
		if(this.isSingleFrame) {
			return;
		}
		if(this.totalFrames == 1) {
			this.isSingleFrame = true;
		}
		button = this.button3;
		root = this;
		
		button.addEventListener("click", jumpToFrame);
		
		function jumpToFrame() {
		    root.parent.gotoAndStop(3); 
		}
	}

	// actions tween:
	this.timeline.addTween(cjs.Tween.get(this).call(this.frame_0).wait(1));

	// 文字_箭头
	this.button3 = new lib.下一步_1();
	this.button3.name = "button3";
	this.button3.setTransform(-674.85,547.1,0.6919,0.6919,0,0,0,149,69.7);
	new cjs.ButtonHelper(this.button3, 0, 1, 2, false, new lib.下一步_1(), 3);

	this.instance = new lib.箭头_1();
	this.instance.setTransform(-916.35,536,0.3703,0.3703,90,0,0,100.2,100);

	this.instance_1 = new lib.CachedBmp_3();
	this.instance_1.setTransform(-958.25,426.9,0.5,0.5);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance_1},{t:this.instance},{t:this.button3}]}).wait(1));

	// 阴影
	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("#0099FF").ss(12,1,1).p("A2nq4MAtPAAAIAAVxMgtPAAAg");
	this.shape.setTransform(-1122.925,497.65);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("rgba(0,0,0,0.447)").s().p("EjH/BmHMAAAjMNMGP/AAAMAAADMNgEjGFBYvMAtRAAAIAA1zMgtRAAAg");
	this.shape_1.setTransform(0,-0.5);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_1},{t:this.shape}]}).wait(1));

	// 背景
	this.instance_2 = new lib.实验引导_1();
	this.instance_2.setTransform(-1280,-654,1.0043,0.9902);

	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(1));

	// 阴影_复制
	this.shape_2 = new cjs.Shape();
	this.shape_2.graphics.f("rgba(0,0,0,0.447)").s().p("EjH/BmHMAAAjMNMGP/AAAMAAADMNg");
	this.shape_2.setTransform(0,-0.5);

	this.timeline.addTween(cjs.Tween.get(this.shape_2).wait(1));

	this._renderFirstFrame();

}).prototype = getMCSymbolPrototype(lib.步骤三, new cjs.Rectangle(-1280,-654,2560,1307), null);


(lib.步骤七 = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	this.isSingleFrame = false;
	// timeline functions:
	this.frame_0 = function() {
		if(this.isSingleFrame) {
			return;
		}
		if(this.totalFrames == 1) {
			this.isSingleFrame = true;
		}
		button = this.button7;
		root = this;
		
		button.addEventListener("click", closeFrame);
		
		function closeFrame() {
			const message = { type: 'CLOSE_GUIDE' };
      		parent.postMessage(message, '*');
		    // window.parent.postMessage('CLOSE_GUIDE', '*');
			// console.log('CLOSE_GUIDE 消息已发送');
		}
	}

	// actions tween:
	this.timeline.addTween(cjs.Tween.get(this).call(this.frame_0).wait(1));

	// 文字_箭头
	this.button7 = new lib.完成学习();
	this.button7.name = "button7";
	this.button7.setTransform(-35.7,139.25);
	new cjs.ButtonHelper(this.button7, 0, 1, 2, false, new lib.完成学习(), 3);

	this.instance = new lib.箭头_1();
	this.instance.setTransform(364.3,14.05,0.6999,0.6999,-90,0,0,100.5,100.2);

	this.instance_1 = new lib.CachedBmp_2();
	this.instance_1.setTransform(35,-55.6,0.5,0.5);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance_1},{t:this.instance},{t:this.button7}]}).wait(1));

	// 阴影
	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("#0099FF").ss(12,1,1).p("EgxMhY1MBiZAAAMAAACxrMhiZAAAg");
	this.shape.setTransform(794.8,48.95);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("rgba(0,0,0,0.447)").s().p("EjH/BmHMAAAjMNMGP/AAAMAAADMNgEBLABgkMBiYAAAMAAAixqMhiYAAAg");
	this.shape_1.setTransform(0,-0.5);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_1},{t:this.shape}]}).wait(1));

	// 背景
	this.instance_2 = new lib.AI助手();
	this.instance_2.setTransform(-1280,-654,1.0043,0.9902);

	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(1));

	// 阴影_复制
	this.shape_2 = new cjs.Shape();
	this.shape_2.graphics.f("rgba(0,0,0,0.447)").s().p("EjH/BmHMAAAjMNMGP/AAAMAAADMNg");
	this.shape_2.setTransform(0,-0.5);

	this.timeline.addTween(cjs.Tween.get(this.shape_2).wait(1));

	this._renderFirstFrame();

}).prototype = getMCSymbolPrototype(lib.步骤七, new cjs.Rectangle(-1280,-654,2560,1307), null);


(lib.步骤一 = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	this.isSingleFrame = false;
	// timeline functions:
	this.frame_0 = function() {
		if(this.isSingleFrame) {
			return;
		}
		if(this.totalFrames == 1) {
			this.isSingleFrame = true;
		}
		button = this.button1;
		root = this;
		
		button.addEventListener("click", jumpToFrame);
		
		function jumpToFrame() {
		    root.parent.gotoAndStop(1); 
		}
	}

	// actions tween:
	this.timeline.addTween(cjs.Tween.get(this).call(this.frame_0).wait(1));

	// 文字_箭头
	this.instance = new lib.箭头_1();
	this.instance.setTransform(1035,-427.7,0.7,0.7,90,0,0,100.3,100.1);

	this.instance_1 = new lib.CachedBmp_1();
	this.instance_1.setTransform(949.2,-357.9,0.5,0.5);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance_1},{t:this.instance}]}).wait(1));

	// 阴影
	this.button1 = new lib.下一步_1();
	this.button1.name = "button1";
	this.button1.setTransform(983.55,-210.4,0.6919,0.6919);
	new cjs.ButtonHelper(this.button1, 0, 1, 2, false, new lib.下一步_1(), 3);

	this.shape = new cjs.Shape();
	this.shape.graphics.f().s("#0099FF").ss(12,1,1).p("EiO8hc5MEd5AAAMAAAC5zMkd5AAAg");
	this.shape.setTransform(3.95,43.175);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("rgba(0,0,0,0.447)").s().p("EjH/BmHMAAAjMNMGP/AAAMAAADMNgEiOVBjvMEd5AAAMAAAi5zMkd5AAAg");
	this.shape_1.setTransform(0,-0.5);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_1},{t:this.shape},{t:this.button1}]}).wait(1));

	// 背景
	this.instance_2 = new lib.实验引导_1();
	this.instance_2.setTransform(-1280,-654,1.0043,0.9902);

	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(1));

	// 阴影_复制
	this.shape_2 = new cjs.Shape();
	this.shape_2.graphics.f("rgba(0,0,0,0.447)").s().p("EjH/BmHMAAAjMNMGP/AAAMAAADMNg");
	this.shape_2.setTransform(0,-0.5);

	this.timeline.addTween(cjs.Tween.get(this.shape_2).wait(1));

	this._renderFirstFrame();

}).prototype = getMCSymbolPrototype(lib.步骤一, new cjs.Rectangle(-1280,-654,2560,1307), null);


// stage content:
(lib.实验引导 = function(mode,startPosition,loop,reversed) {
if (loop == null) { loop = true; }
if (reversed == null) { reversed = false; }
	var props = new Object();
	props.mode = mode;
	props.startPosition = startPosition;
	props.labels = {};
	props.loop = loop;
	props.reversed = reversed;
	cjs.MovieClip.apply(this,[props]);

	this.actionFrames = [0];
	// timeline functions:
	this.frame_0 = function() {
		this.stop();
	}

	// actions tween:
	this.timeline.addTween(cjs.Tween.get(this).call(this.frame_0).wait(7));

	// 背景
	this.step1 = new lib.步骤一();
	this.step1.name = "step1";
	this.step1.setTransform(1280,653.5,1,1,0,0,0,0,-0.5);

	this.step2 = new lib.步骤二();
	this.step2.name = "step2";
	this.step2.setTransform(1280,653.5,1,1,0,0,0,0,-0.5);

	this.step3 = new lib.步骤三();
	this.step3.name = "step3";
	this.step3.setTransform(1280,653.5,1,1,0,0,0,0,-0.5);

	this.step4 = new lib.步骤四();
	this.step4.name = "step4";
	this.step4.setTransform(1283,653.5,1,1,0,0,0,3,-0.5);

	this.step5 = new lib.步骤五();
	this.step5.name = "step5";
	this.step5.setTransform(1283,653.5,1,1,0,0,0,3,-0.5);

	this.step6 = new lib.步骤六();
	this.step6.name = "step6";
	this.step6.setTransform(1283,653.5,1,1,0,0,0,3,-0.5);

	this.step7 = new lib.步骤七();
	this.step7.name = "step7";
	this.step7.setTransform(1280,653.5,1,1,0,0,0,0,-0.5);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.step1}]}).to({state:[{t:this.step2}]},1).to({state:[{t:this.step3}]},1).to({state:[{t:this.step4}]},1).to({state:[{t:this.step5}]},1).to({state:[{t:this.step6}]},1).to({state:[{t:this.step7}]},1).wait(1));

	this._renderFirstFrame();

}).prototype = p = new lib.AnMovieClip();
p.nominalBounds = new cjs.Rectangle(1280,653.5,1286,657.5);
// library properties:
lib.properties = {
	id: '46342F2B3391A146A55BB773325E0D72',
	width: 2560,
	height: 1307,
	fps: 24,
	color: "#FFFFFF",
	opacity: 1.00,
	manifest: [
		{src:"images/CachedBmp_5.png?1757434534973", id:"CachedBmp_5"},
		{src:"images/AI助手.png?1757434534973", id:"AI助手"},
		{src:"images/学习目标_.png?1757434534973", id:"学习目标"},
		{src:"images/实验引导_1.png?1757434534973", id:"实验引导_1"},
		{src:"images/实验引导_atlas_1.png?1757434534900", id:"实验引导_atlas_1"}
	],
	preloads: []
};



// bootstrap callback support:

(lib.Stage = function(canvas) {
	createjs.Stage.call(this, canvas);
}).prototype = p = new createjs.Stage();

p.setAutoPlay = function(autoPlay) {
	this.tickEnabled = autoPlay;
}
p.play = function() { this.tickEnabled = true; this.getChildAt(0).gotoAndPlay(this.getTimelinePosition()) }
p.stop = function(ms) { if(ms) this.seek(ms); this.tickEnabled = false; }
p.seek = function(ms) { this.tickEnabled = true; this.getChildAt(0).gotoAndStop(lib.properties.fps * ms / 1000); }
p.getDuration = function() { return this.getChildAt(0).totalFrames / lib.properties.fps * 1000; }

p.getTimelinePosition = function() { return this.getChildAt(0).currentFrame / lib.properties.fps * 1000; }

an.bootcompsLoaded = an.bootcompsLoaded || [];
if(!an.bootstrapListeners) {
	an.bootstrapListeners=[];
}

an.bootstrapCallback=function(fnCallback) {
	an.bootstrapListeners.push(fnCallback);
	if(an.bootcompsLoaded.length > 0) {
		for(var i=0; i<an.bootcompsLoaded.length; ++i) {
			fnCallback(an.bootcompsLoaded[i]);
		}
	}
};

an.compositions = an.compositions || {};
an.compositions['46342F2B3391A146A55BB773325E0D72'] = {
	getStage: function() { return exportRoot.stage; },
	getLibrary: function() { return lib; },
	getSpriteSheet: function() { return ss; },
	getImages: function() { return img; }
};

an.compositionLoaded = function(id) {
	an.bootcompsLoaded.push(id);
	for(var j=0; j<an.bootstrapListeners.length; j++) {
		an.bootstrapListeners[j](id);
	}
}

an.getComposition = function(id) {
	return an.compositions[id];
}


an.makeResponsive = function(isResp, respDim, isScale, scaleType, domContainers) {		
	var lastW, lastH, lastS=1;		
	window.addEventListener('resize', resizeCanvas);		
	resizeCanvas();		
	function resizeCanvas() {			
		var w = lib.properties.width, h = lib.properties.height;			
		var iw = window.innerWidth, ih=window.innerHeight;			
		var pRatio = window.devicePixelRatio || 1, xRatio=iw/w, yRatio=ih/h, sRatio=1;			
		if(isResp) {                
			if((respDim=='width'&&lastW==iw) || (respDim=='height'&&lastH==ih)) {                    
				sRatio = lastS;                
			}				
			else if(!isScale) {					
				if(iw<w || ih<h)						
					sRatio = Math.min(xRatio, yRatio);				
			}				
			else if(scaleType==1) {					
				sRatio = Math.min(xRatio, yRatio);				
			}				
			else if(scaleType==2) {					
				sRatio = Math.max(xRatio, yRatio);				
			}			
		}
		domContainers[0].width = w * pRatio * sRatio;			
		domContainers[0].height = h * pRatio * sRatio;
		domContainers.forEach(function(container) {				
			container.style.width = w * sRatio + 'px';				
			container.style.height = h * sRatio + 'px';			
		});
		stage.scaleX = pRatio*sRatio;			
		stage.scaleY = pRatio*sRatio;
		lastW = iw; lastH = ih; lastS = sRatio;            
		stage.tickOnUpdate = false;            
		stage.update();            
		stage.tickOnUpdate = true;		
	}
}
an.handleSoundStreamOnTick = function(event) {
	if(!event.paused){
		var stageChild = stage.getChildAt(0);
		if(!stageChild.paused || stageChild.ignorePause){
			stageChild.syncStreamSounds();
		}
	}
}
an.handleFilterCache = function(event) {
	if(!event.paused){
		var target = event.target;
		if(target){
			if(target.filterCacheList){
				for(var index = 0; index < target.filterCacheList.length ; index++){
					var cacheInst = target.filterCacheList[index];
					if((cacheInst.startFrame <= target.currentFrame) && (target.currentFrame <= cacheInst.endFrame)){
						cacheInst.instance.cache(cacheInst.x, cacheInst.y, cacheInst.w, cacheInst.h);
					}
				}
			}
		}
	}
}


})(createjs = createjs||{}, AdobeAn = AdobeAn||{});
var createjs, AdobeAn;