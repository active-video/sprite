/**
 * Created by cwagner on 2/17/16.
 * Due to the non-deterministic framerate of GIFs and the inability
 * to synchronize the frames of many GIFs within a webpage, adding many
 * GIFs hits performance greatly.
 *
 * Given a sprite sheet, assumed to be at NTSC 30fps (configurable), this
 * library will add the sprite to a collection of sprites in the page,
 * and based on the throttling used (SpriteManager.prototype.fps or
 * SpriteManager.getInsance().updateFps(newFps)) will fire off the next
 * frame of the Sprite on all registered sprites.
 *
 * Support in Sprite for interpolating by default. This means that a
 * Sprite which is created with 30 columns representing 1 second worth
 * of steps in the animation at 30fps, when executed at a lower frame rate,
 * for example 15fps, will play frame 1, 3, 5, ..., 29, ...repeat instead
 * of stepping frame by frame. Note - interpolating is the standard
 * manner by which animations have a constant rate in the time domain
 * regardless of how often the animation executes. See examples like
 * https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame#Notes for
 * general implementation overview of tweening/interpolating.
 */



function Sprite(){
    this.init.apply(this, arguments);
}

Sprite.prototype = {
    _ready: false,
    _image: null,
    _preload: null,
    _cleaned: false,
    _sizeX: null,
    _sizeY: null,
    _rows: null,
    _frames: null,
    _times: null,

    _loops: 0,


    _currentFrame: null,
    _lastFrameTime: 0,

    _framesShown: 0,
    _averageFps: null,

    options: null,


    init: function(img, options){
        var src = this.getSpriteUrl(img);

        this._image = img;
        this._onLoad = this.onLoad.bind(this);
        this.options = {
            noInterpolate: false,
            loop: true,
            fps: 30//how many frames are contained horizontally in the sprite, assuming 100% width = 1 second (1 row = 1 second)
        };
        if(options) {
            for(var prop in options) {
                this.options[prop] = options[prop];
            }
        }
        this.fps = this.options.fps;

        if(!src) {
            img.src = img.getAttribute('sprite');
            return;
        } else {
            this.preloadImage(src)
        }


    },

    getSpriteUrl: function(img){
        var src = img.src,
            sprite = img.getAttribute('sprite');
        if(sprite && sprite.match(/\/.*sprite/i)) {
            return sprite;
        } else if (src && src.match(/\/.*sprite/i)) {
            return src;
        } else {
            return false;
        }
    },

    preloadImage: function(src) {
        if(!src) {
            return;
        }

        //preload the image
        if(!this._preload) {
            this._preload = document.createElement('img');
            this._preload.addEventListener('load', this._onLoad);
        }

        this._preload.src = src;

        //NOTE - the following is a must, otherwise the image will draw with a placeholder grey border that
        //cannot be removed with CSS. This is a 1x1 transparent PNG.
        this._image.classList.add('sprite');
        this._image.setAttribute('src', 'data:image/png;base64,R0lGODlhFAAUAIAAAP///wAAACH5BAEAAAAALAAAAAAUABQAAAIRhI+py+0Po5y02ouz3rz7rxUAOw==');

        //If already in browser cache
        if(this._preload.width > 1) {
            this.onLoad();
        }
    },

    stop: function(){
        SpriteManager.getInstance().remove(this);
    },

    /**
     * Updates the sprite, and begins listening to SpriteManager for
     * frames, or removes sprite if no ".sprite" is found and
     * stops SpriteManager from firing updates
     */
    reinit: function(){
        var src = this.getSpriteUrl(this._image),
            spriteAttribute = this._image.getAttribute('sprite');
        if(src) {
            //same image URL will be ignored
            if(src != this._preload.getAttribute('src')) {
                this._image.style.backgroundImage = 'none';
                this.preloadImage(src);
                SpriteManager.getInstance().add(this);
            }
        } else if(spriteAttribute){
            SpriteManager.getInstance().remove(this);
            this._image.src = spriteAttribute;

            if(this._preload){
                this._preload.removeAttribute('src');
            }
        }
    },

    onLoad: function() {
        if(this._cleaned) {
            return;
        }

        this.detectDimensions();

        //initialize _lastFrameTime
        this._lastFrameTime = Date.now();
        this._ready = true;

        //Set the container background to the image
        this._image.style.backgroundImage = 'url(' + this._preload.src + ')';
        this._currentFrame = -1;

        SpriteManager.getInstance().add(this);
    },

    next: function(timeSinceLast){
        if(!this._ready) {
            return;
        }

        var now = Date.now(),
            ms = timeSinceLast ? timeSinceLast : now - this._lastFrameTime,
            stop = false,
            frames = this.options.noInterpolate ? 1 : Math.round(ms/this.options.frameDuration);

        this._currentFrame = this._currentFrame < 0 ? 0 : (this._currentFrame + frames);

        //loop forever? just mod it
        if(this.options.loop === true || this._currentFrame < this._frames) {
            this._currentFrame %= this._frames;
        //past end and loop finite count?
        } else if(typeof this.options.loop === 'number' && this._currentFrame >= this._frames) {
            //already looped max times?
            if(this._loops >= this.options.loop) {
                this._currentFrame = this._frames - 1;//put them on the last frame
                stop = true;
                //haven't hit max but at end?
            } else {
                this._loops++;
                this._currentFrame %= this._frames;
            }
        //past end and don't loop
        } else if(!this.options.loop && this._currentFrame >= this._frames) {
            this._currentFrame = this._frames - 1;
            stop = true;
        }

        var x = -(this._currentFrame % this.fps) * this._sizeX,
            y = -Math.floor(this._currentFrame/this.fps) * this._sizeY;

        this._image.style.backgroundPosition = x + 'px ' + y + 'px';
        this._lastFrameTime = now;
        this._framesShown++;
        this.calculateActualFps(1000/ms);

        if(stop) {
            this.stop();
        }

        //uncomment to log the output of performance benchmarks, Chrome can keep up with 30fps, CloudTV tops out on a Brix unit at 19-20fps
        //console.log('frame: ' + this._currentFrame + ', ' + Math.round(this._averageFps*10)/10 + 'fps average (goal=' + this.fps + '), ' + ' timeSinceLast=' + timeSinceLast + ', ' + this._preload.getAttribute('src'));
    },

    calculateActualFps: function(framesSinceLast){
        //running average = (previous average) * (n-1)/n + (new value)/n
        this._averageFps = this._averageFps*(this._framesShown-1)/this._framesShown + framesSinceLast/this._framesShown;
    },



    /**
     * Detect the image dimensions, frame count, and tile size. Always round down as partials are not supported
     */
    detectDimensions: function(){
        if(this.options.width) {
            this.fps = Math.ceil(this._preload.width/this.options.width);
        }
        this._sizeX = this.options.width || Math.floor(this._preload.width / this.fps);
        this._sizeY = this.options.height || this._sizeX;

        this._rows = Math.floor(this._preload.height / this._sizeY);
        this._frames = this._rows * this.fps;

        this._image.style.width = this._sizeX + 'px';
        this._image.style.height = this._sizeY + 'px';

        if(!this.options.frameDuration) {
            this.options.frameDuration = 1000/this.fps;
        }
    },

    removeListeners: function(){
        if(!this._cleaned) {
            this._image.removeEventListener('load', this._onLoad);
        }
    },

    cleanup: function(){
        this.removeListeners();
        this._image = null;
        this._onLoad = null;

        SpriteManager.getInstance().remove(this);

        this._cleaned = true;
    }
};


/**
 * @class SpriteManager Ensures that when an animation frame is fired, all sprites are updated at the same time, according to
 * the throttling provided in fps
 */
function SpriteManager(){
    this.init.apply(this, arguments);
}


SpriteManager.prototype = {
    instance: null,
    sprites: null,
    _paused: true,
    initialFps: null,
    fps: (window.GLOBAL_CONFIG && GLOBAL_CONFIG && GLOBAL_CONFIG.PERFORMANCE && GLOBAL_CONFIG.PERFORMANCE.SPRITE_FPS) || 15,
    lastFrame: 0,
    raf: 0,

    init: function(){
        if(SpriteManager.prototype.instance) {
            throw new TypeError("Trying to create a new instance of SpriteManager is not allowed, SpriteManager is a singleton factory");
        }
        this.sprites = [];
        this.initialFps = this.fps;
        this.next = this.next.bind(this);

        SpriteManager.prototype.instance = this;
    },

    updateFps: function(fps){
        this.fps = fps;
    },

    resetFps: function(){
        this.fps = this.initialFps;
    },

    getIndex: function(sprite) {
        return this.sprites.indexOf(sprite);
    },


    add: function(sprite){
        if(this.getIndex(sprite) === -1) {
            this.sprites.push(sprite);
        }

        if(this._paused && this.sprites.length) {
            this.play();
        }
    },

    remove: function(sprite){
        var index = this.getIndex(sprite);

        if(index !== -1) {
            this.sprites.splice(index, 1);
        }

        if(!this.sprites.length) {
            this.pause();
        }
    },

    pause: function(){
        this._paused = true;
        this.lastFrame = 0;

        if(this.raf) {
            window.cancelAnimationFrame(this.raf);
            this.raf = 0;
        }
    },

    play: function(){
        this._paused = false;
        if(!this.raf) {
            this.raf = window.requestAnimationFrame(this.next);
        }
    },

    next: function(currentTime){
        if(!this.lastFrame) {
            this.lastFrame = currentTime;
        }

        var frameDurationMs = (1000/this.fps),
            timeSinceLast = (currentTime - this.lastFrame),
            ticks = Math.floor(timeSinceLast / frameDurationMs);

        if(ticks > 0) {
            this.lastFrame = currentTime;
            this.broadcast(timeSinceLast);
        }


        this.raf = window.requestAnimationFrame(this.next);
    },

    broadcast: function(timeSinceLast){
        for(var i=0; i < this.sprites.length; i++) {
            this.sprites[i].next(timeSinceLast);
        }
    },

    spritify: function(collection, options) {
        for(var i=0; i<collection.length; i++){
            new Sprite(collection[i], options);
        }
    },

    cleanup: function(){
        for(var i=this.sprites.length; i >= 0; i--) {
            this.remove(this.sprites[i]);
        }
    },

    getCount: function(){
        return this.sprites.length;
    }
};

SpriteManager.getInstance = function(){
    return SpriteManager.prototype.instance || new SpriteManager();
};
