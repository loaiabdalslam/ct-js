/**
 * @extends {PIXI.TilingSprite}
 */
class Background extends PIXI.TilingSprite {
    constructor(bgName, frame, depth, exts) {
        exts = exts || {};
        var width = ct.viewWidth,
            height = ct.viewHeight;
        if (exts.repeat === 'no-repeat' || exts.repeat === 'repeat-x') {
            height = ct.res.getTexture(bgName, frame || 0).orig.height * (exts.scaleY || 1);
        }
        if (exts.repeat === 'no-repeat' || exts.repeat === 'repeat-y') {
            width = ct.res.getTexture(bgName, frame || 0).orig.width * (exts.scaleX || 1);
        }
        super(ct.res.getTexture(bgName, frame || 0), width, height);
        ct.types.list.BACKGROUND.push(this);
        this.anchor.x = this.anchor.y = 0;
        this.depth = depth;
        this.shiftX = this.shiftY = this.movementX = this.movementY = 0;
        this.parallaxX = this.parallaxY = 1;
        if (exts) {
            ct.u.extend(this, exts);
        }
        if (this.scaleX) {
            this.tileScale.x = Number(this.scaleX);
        }
        if (this.scaleY) {
            this.tileScale.y = Number(this.scaleY);
        }
    }
    onStep() {
        this.shiftX += ct.delta * this.movementX;
        this.shiftY += ct.delta * this.movementY;
    }
    onDraw() {
        if (this.repeat !== 'repeat-x' && this.repeat !== 'no-repeat') {
            this.y = ct.room.y;
            this.tilePosition.y = -this.y*this.parallaxY + this.shiftY;
        } else {
            this.y = this.shiftY + ct.room.y * (this.parallaxY - 1);
        }
        if (this.repeat !== 'repeat-y' && this.repeat !== 'no-repeat') {
            this.x = ct.room.x;
            this.tilePosition.x = -this.x*this.parallaxX + this.shiftX;
        } else {
            this.x = this.shiftX + ct.room.x * (this.parallaxX - 1);
        }
    }
    static onCreate() {
        void 0;
    }
    static onDestroy() {
        void 0;
    }
}
/**
 * @extends {PIXI.Container}
 */
class Tileset extends PIXI.Container {
    constructor(data) {
        super();
        this.depth = data.depth;
        this.tiles = data.tiles;
        ct.types.list.TILELAYER.push(this);
        for (let i = 0, l = data.tiles.length; i < l; i++) {
            const textures = ct.res.getTexture(data.tiles[i].texture);
            const sprite = new PIXI.Sprite(textures[data.tiles[i].frame]);
            sprite.anchor.x = sprite.anchor.y = 0;
            this.addChild(sprite);
            sprite.x = data.tiles[i].x;
            sprite.y = data.tiles[i].y;
        }
        const bounds = this.getLocalBounds();
        const cols = Math.ceil(bounds.width / 1024),
                rows = Math.ceil(bounds.height / 1024);
        if (cols < 2 && rows < 2) {
            if (this.width > 0 && this.height > 0) {
                this.cacheAsBitmap = true;
            }
            return this;
        }
        /*const mask = new PIXI.Graphics();
        mask.lineStyle(0);
        mask.beginFill(0xffffff);
        mask.drawRect(0, 0, 1024, 1024);
        mask.endFill();*/
        this.cells = [];
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const cell = new PIXI.Container();
                //cell.x = x * 1024 + bounds.x;
                //cell.y = y * 1024 + bounds.y;
                this.cells.push(cell);
            }
        }
        for (let i = 0, l = data.tiles.length; i < l; i++) {
            const tile = this.children[0],
                    x = Math.floor((tile.x - bounds.x) / 1024),
                    y = Math.floor((tile.y - bounds.y) / 1024);
            this.cells[y * cols + x].addChild(tile);
            /*if (tile.x - x * 1024 + tile.width > 1024) {
                this.cells[y*cols + x + 1].addChild(tile);
                if (tile.y - y * 1024 + tile.height > 1024) {
                    this.cells[(y+1)*cols + x + 1].addChild(tile);
                }
            }
            if (tile.y - y * 1024 + tile.height > 1024) {
                this.cells[(y+1)*cols + x].addChild(tile);
            }*/
        }
        this.removeChildren();
        for (let i = 0, l = this.cells.length; i < l; i++) {
            if (this.cells[i].children.length === 0) {
                this.cells.splice(i, 1);
                i--; l--;
                continue;
            }
            //this.cells[i].mask = mask;
            this.addChild(this.cells[i]);
            this.cells[i].cacheAsBitmap = true;
        }
    }
}
/**
 * @extends {PIXI.AnimatedSprite}
 * @class
 * @property {string} type The name of the type from which the copy was created
 * @property {IShapeTemplate} shape The collision shape of a copy
 * @property {number} xprev The horizontal location of a copy in the previous frame
 * @property {number} yprev The vertical location of a copy in the previous frame
 * @property {number} hspeed The horizontal speed of a copy
 * @property {number} vspeed The vertical speed of a copy
 * @property {number} gravity The acceleration that pulls a copy at each frame
 * @property {number} gravityDir The direction of acceleration that pulls a copy at each frame
 * @property {number} depth The position of a copy in draw calls
 * @property {boolean} kill If set to `true`, the copy will be destroyed by the end of a frame.
 */
const Copy = (function () {
    const textureAccessor = Symbol('texture');
    class Copy extends PIXI.AnimatedSprite {
        /**
         * Creates an instance of Copy.
         * @param {string} type The name of the type to copy
         * @param {number} [x] The x coordinate of a new copy. Defaults to 0.
         * @param {number} [y] The y coordinate of a new copy. Defaults to 0.
         * @param {object} [exts] An optional object with additional properties
         * that will exist prior to a copy's OnCreate event
         * @memberof Copy
         */
        constructor(type, x, y, exts) {
            var t;
            if (type) {
                if (!(type in ct.types.templates)) {
                    throw new Error(`[ct.types] An attempt to create a copy of a non-existent type \`${type}\` detected. A typo?`);
                }
                t = ct.types.templates[type];
                if (t.texture && t.texture !== '-1') {
                    const textures = ct.res.getTexture(t.texture);
                    super(textures);
                    this[textureAccessor] = t.texture;
                    this.anchor.x = textures[0].defaultAnchor.x;
                    this.anchor.y = textures[0].defaultAnchor.y;
                } else {
                    super([PIXI.Texture.EMPTY]);
                }
                this.type = type;
                if (t.extends) {
                    ct.u.ext(this, t.extends);
                }
            } else {
                super([PIXI.Texture.EMPTY]);
            }
            // it is defined in main.js
            // eslint-disable-next-line no-undef
            this[copyTypeSymbol] = true;
            if (exts) {
                ct.u.ext(this, exts);
                if (exts.tx) {
                    this.scale.x = exts.tx;
                    this.scale.y = exts.ty;
                }
            }
            this.position.set(x || 0, y || 0);
            this.xprev = this.xstart = this.x;
            this.yprev = this.ystart = this.y;
            this.speed = this.direction = this.gravity = this.hspeed = this.vspeed = 0;
            this.gravityDir = 270;
            this.depth = 0;
            this.uid = ++ct.room.uid;
            if (type) {
                ct.u.ext(this, {
                    type,
                    depth: t.depth,
                    onStep: t.onStep,
                    onDraw: t.onDraw,
                    onCreate: t.onCreate,
                    onDestroy: t.onDestroy,
                    shape: t.texture ? ct.res.registry[t.texture].shape : {}
                });
                if (ct.types.list[type]) {
                    ct.types.list[type].push(this);
                } else {
                    ct.types.list[type] = [this];
                }
                ct.types.templates[type].onCreate.apply(this);
            }
            return this;
        }

        /**
         * The name of the current copy's texture
         * @param {string} value The name of the new texture
         * @type {string}
         */
        set tex(value) {
            this.textures = ct.res.getTexture(value);
            this[textureAccessor] = value;
            this.shape = value !== -1 ? ct.res.registry[value].shape : {};
            this.anchor.x = this.textures[0].defaultAnchor.x;
            this.anchor.y = this.textures[0].defaultAnchor.y;
            return value;
        }
        get tex() {
            return this[textureAccessor];
        }

        get speed() {
            return Math.hypot(this.hspeed, this.vspeed);
        }
        /**
         * The speed of a copy that is used in `this.move()` calls
         * @param {number} value The new speed value
         * @type {number}
         */
        set speed(value) {
            if (this.speed === 0) {
                this.hspeed = value;
                return;
            }
            var multiplier = value / this.speed;
            this.hspeed *= multiplier;
            this.vspeed *= multiplier;
        }
        get direction() {
            return (Math.atan2(this.vspeed, this.hspeed) * -180 / Math.PI + 360) % 360;
        }
        /**
         * The moving direction of the copy, in degrees, starting with 0 at the right side
         * and going with 90 facing upwards, 180 facing left, 270 facing down.
         * This parameter is used by `this.move()` call.
         * @param {number} value New direction
         * @type {number}
         */
        set direction(value) {
            var speed = this.speed;
            this.hspeed = speed * Math.cos(value*Math.PI/-180);
            this.vspeed = speed * Math.sin(value*Math.PI/-180);
            return value;
        }
        get rotation() {
            return this.transform.rotation / Math.PI * -180;
        }
        /**
         * The direction of a copy's texture.
         * @param {number} value New rotation value
         * @type {number}
         */
        set rotation(value) {
            this.transform.rotation = value * Math.PI / -180;
            return value;
        }

        /**
         * Performs a movement step, reading such parameters as `gravity`, `speed`, `direction`.
         * @returns {void}
         */
        move() {
            if (this.gravity) {
                this.hspeed += this.gravity * ct.delta * Math.cos(this.gravityDir*Math.PI/-180);
                this.vspeed += this.gravity * ct.delta * Math.sin(this.gravityDir*Math.PI/-180);
            }
            this.x += this.hspeed * ct.delta;
            this.y += this.vspeed * ct.delta;
        }
        /**
         * Adds a speed vector to the copy, accelerating it by a given delta speed in a given direction.
         * @param {number} spd Additive speed
         * @param {number} dir The direction in which to apply additional speed
         * @returns {void}
         */
        addSpeed(spd, dir) {
            this.hspeed += spd * Math.cos(dir*Math.PI/-180);
            this.vspeed += spd * Math.sin(dir*Math.PI/-180);
        }
    }
    return Copy;
})();

(function (ct) {
    const onCreateModifier = function () {
        /*%oncreate%*/
    };

    /**
     * An object with properties and methods for manipulating types and copies,
     * mainly for finding particular copies and creating new ones.
     * @namespace
     */
    ct.types = {
        Copy,
        Background,
        Tileset,
        /**
         * An object that contains arrays of copies of all types.
         * @type {Object.<string,Array<Copy>>}
         */
        list: {
            BACKGROUND: [],
            TILELAYER: []
        },
        /**
         * A map of all the templates of types exported from ct.IDE.
         * @type {object}
         */
        templates: { },
        /**
         * Creates a new copy of a given type.
         * @param {string} type The name of the type to use
         * @param {number} [x] The x coordinate of a new copy. Defaults to 0.
         * @param {number} [y] The y coordinate of a new copy. Defaults to 0.
         * @param {object} [exts] An optional object which parameters will be applied to the copy prior to its OnCreate event.
         * @param {PIXI.Container} [container] The container to which add the copy. Defaults to the current room.
         * @returns {Copy} the created copy.
         * @alias ct.types.copy
         */
        make(type, x, y, exts, container) {
            // An advanced constructor. Returns a Copy
            if (exts instanceof PIXI.Container) {
                container = exts;
                exts = void 0;
            }
            const obj = new Copy(type, x, y, exts);
            if (container) {
                container.addChild(obj);
            } else {
                ct.room.addChild(obj);
            }
            ct.stack.push(obj);
            onCreateModifier.apply(obj);
            return obj;
        },
        /**
         * Calls `move` on a given copy, recalculating its position based on its speed.
         * @param {Copy} o The copy to move
         * @returns {void}
         * @deprecated
         */
        move(o) {
            o.move();
        },
        /**
         * Applies an acceleration to the copy, with a given additive speed and direction.
         * Technically, calls copy's `addSpeed(spd, dir)` method.
         * @param {any} o The copy to accelerate
         * @param {any} spd The speed to add
         * @param {any} dir The direction in which to push the copy
         * @returns {void}
         * @deprecated
         */
        addSpeed(o, spd, dir) {
            o.addSpeed(spd, dir);
        },
        /**
         * Applies a function to each copy in the current room
         * @param {Function} func The function to apply
         * @returns {void}
         */
        each(func) {
            for (const i in ct.stack) {
                func.apply(ct.stack[i], this);
            }
        },
        /*
         * Applies a function to a given object (e.g. to a copy)
         */
        'with'(obj, func) {
            func.apply(obj, this);
        }
    };
    ct.types.copy = ct.types.make;
    ct.types.addSpd = ct.types.addSpeed;

    /*@types@*/
    /*%types%*/

    ct.types.beforeStep = function () {
        /*%beforestep%*/
    };
    ct.types.afterStep = function () {
        /*%afterstep%*/
    };
    ct.types.beforeDraw = function () {
        /*%beforedraw%*/
    };
    ct.types.afterDraw = function () {
        /*%afterdraw%*/
    };
    ct.types.onDestroy = function () {
        /*%ondestroy%*/
    };
})(ct);
