; (function () {
  var canUseShadowDOM = 'function' === typeof document.documentElement.createShadowRoot /*&& false*/;
  var isTouch = window.ontouchstart !== undefined;
  function LP_RD(opts) {
    opts = opts || {};
    this.version = '0.0.1-shadow-test';
    this.doms = [];
    this.eventType;
    this.evHandler = {};
    var styleSheets = opts.styleSheets || '.lp-rd{position:relative;-moz-user-select:none;-webkit-user-select:none;-ms-user-select:none}.lp-rd,.lp-rd *{box-sizing:border-box}.lp-rd-mask{display:block;position:absolute;width:100%;height:100%;overflow:hidden;pointer-events:none;border-radius:5px;top:0;left:0;-webkit-mask-image:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAA5JREFUeNpiYGBgAAgwAAAEAAGbA+oJAAAAAElFTkSuQmCC")}.lp-rd-mask:after{clear:both}.lp-drop{z-index:5;transition:opacity .5s linear,transform .5s ease-in;opacity:0;display:block;position:absolute;will-change:transform,opacity;border-radius:50% 50%}.lp-rd-mask.active .lp-drop{transition:transform .9s ease-out,opacity .2s ease-out;opacity:.4}.lp-rd-container{position:relative;width:100%;height:100%;}';
    var style = document.createElement('style');
    if (canUseShadowDOM) {
      this.template = document.createElement('template');
      style.textContent = styleSheets;
      this.template.content.appendChild(style);
      var container = document.createElement('div');
      container.classList.add('lp-rd-container');
      var content = document.createElement('content');
      content.setAttribute('select', '');
      container.appendChild(content);
      this.template.content.appendChild(container);
      this.shadow = _createRDDOM.call(this, 0, 0, 0, null, canUseShadowDOM);
    }else{
      style.textContent = styleSheets; 
      document.head.appendChild(style);
    }
  }
  LP_RD.prototype.init = _scanDomAndBindEvents;
  LP_RD.prototype.clear = _clear;

  var lp_rd = new LP_RD();
  return window.lp_rd = lp_rd;

  /**
   * @param  {number} x position:x
   * @param  {number} y position:y
   * @param  {number} r radius
   * @param  {string} bgcolor
   */
  function _createRDDOM(x, y, r, color, useShadowDom) {
    color = color || '#fff';
    var maskDOM = document.createElement('div');
    var dropDOM = document.createElement('div');
    maskDOM.classList.add('lp-rd-mask');

    dropDOM.classList.add('lp-drop');
    dropDOM.style.width = dropDOM.style.height = 2 * r + 'px';
    dropDOM.setAttribute("data-rd-radius", r);
    _resetDropDOM(dropDOM, x, y, r);
    dropDOM.style.backgroundColor = color;
    maskDOM.appendChild(dropDOM);
    if (useShadowDom) {
      var _template = document.importNode(this.template, true);
      _template.content.querySelector('.lp-rd-container').appendChild(maskDOM);
      return _template.content;
    }
    return maskDOM;
  }

  function _scanDomAndBindEvents(range, forceMobile) {
    var me = this;
    isTouch = isTouch || forceMobile;
    if (range.nodeType != 9
      && range.nodeType != 1) return this;

    //chrome inspector in mobile mode just cannot dispatch the touchend event currectly.
    this.eventType = isTouch ? ['touchstart', 'touchend', 'selectstart'] : ['mousedown', 'mouseup', 'selectstart'];
    this.evHandler = { up: null, down: null, drag: null };
    if (canUseShadowDOM) {
      var hosts = range.querySelectorAll('.lp-rd');
      Array.from(hosts).forEach(function (host) {
        host.style.webkitUserSelect = 'none';
        var shadow = host.createShadowRoot();
        shadow.appendChild(document.importNode(me.shadow, true));
      });
    }
    window.addEventListener(this.eventType[0], this.evHandler.down = rdActionAsync(this), false);
    window.addEventListener(this.eventType[1], this.evHandler.up = antiRdActionAsync(this), false);
    window.addEventListener(this.eventType[2], this.evHandler.drag = preventDefaultDragSelect, false);
    return this;

    function preventDefaultDragSelect(e) {
      var c;
      if (c = _findClosetRDDOM(e.target, 'child')) {
        e.preventDefault();
      }
    }

    function _rdAction(e) {
      var tar, rd, r, x, y, tmprect, _dom, orgx, orgy;
      tar = _findClosetRDDOM(e.target);
      if (!tar) return;

      if (isTouch && e.touches.length) {
        orgx = e.touches[0].clientX;
        orgy = e.touches[0].clientY;
      } else {
        orgx = e.clientX;
        orgy = e.clientY;
      }
      var pos = tar.getBoundingClientRect();
      x = orgx - pos.left;
      y = orgy - pos.top;

      var delta = [Math.max(Math.abs(pos.left - orgx), Math.abs(pos.right - orgx)), Math.max(Math.abs(pos.top - orgy), Math.abs(pos.bottom - orgy))];
      r = Math.sqrt(delta[0] * delta[0] + delta[1] * delta[1]);
      x = x - r;
      y = y - r;

      var drops;
      if ((drops = Array.prototype.slice.call(tar.querySelectorAll('.lp-rd-mask')), 0).length && !canUseShadowDOM) {
        drops.forEach(function (d) {
          d.remove();
        });
      }

      if (canUseShadowDOM) {
        var shadowRoot = tar.shadowRoot;
        _dom = shadowRoot.querySelector('.lp-rd-mask');
        _resetDropDOM(_dom.querySelector('.lp-drop'), x, y, r);
        _stopPreTransition(_dom.querySelector('.lp-drop'));
      } else {
        _dom = _createRDDOM.call(this, x, y, r, null, canUseShadowDOM);
        tar.appendChild(_dom);
      }
      this.doms.push({ status: 'active', dom: _dom });
      requestAnimationFrame(function () {
        _dom.classList.add('active');
        var _rd = _dom.querySelector('.lp-drop');
        var _r = _rd.getAttribute('data-rd-radius');
        _rd.style.transform = 'scale3d(1, 1, 1)';
      });
    }

    function _cancelAction(e) {
      var me = this;
      this.doms = this.doms.filter(function (d) { return d.status == 'active'; });
      this.doms.forEach(function (datum, i) {
        var d = datum.dom;
        datum.status = 'closing';
        d.classList.remove('active');
        rd = d.querySelector('.lp-drop');
        var r = rd.getAttribute('data-rd-radius');
        _resetDropDOM(rd, null, null, parseInt(r));
        if (!canUseShadowDOM) {
          rd.addEventListener('transitionend', function (e) {
            e.currentTarget.parentElement.remove();
          });
        }
      });
    }

    function _findClosetRDDOM(tar, child) {
      var curDOM = tar;
      if (child == 'child') return curDOM.querySelector('.lp-drop');
      do {
        if (curDOM.classList.contains('lp-rd'))
          return curDOM;
      } while (curDOM = curDOM.parentElement);
      return null;
    }

    function antiRdActionAsync(ctx) {
      return function (e) {
        requestAnimationFrame(function () {
          _cancelAction.call(ctx, e);
        });
      }
    }

    function rdActionAsync(ctx) {
      return function (e) {
        requestAnimationFrame(function () { _rdAction.call(ctx, e); });
      }
    }
  }

  function _resetPosition(tar, x, y) {
    !isNaN(x) && (tar.style.left = x + 'px');
    !isNaN(y) && (tar.style.top = y + 'px');
  }

  function _resetDropDOM(rd, x, y, r) {
    var radius = r == 0 ? 0 : 1 / r;
    _resetPosition(rd, x, y);
    rd.style.transform = 'scale3d(' + radius + ',' + radius + ',1)';
    if (canUseShadowDOM) {
      rd.setAttribute('data-rd-radius', r);
      requestAnimationFrame(function () {
        rd.style.transition = '';
        rd.style.height = 2 * r + 'px';
        rd.style.width = 2 * r + 'px';
      });
    }
  }

  function _stopPreTransition(rd) {
    rd.style.height = '0px';
    rd.style.width = '0px';
    rd.style.transition = 'none';
  }

  function _clear() {
    this.dom = [];
    if (this.evHandler.down)
      window.removeEventListener(this.eventType[0], this.evHandler.down, false);
    if (this.evHandler.up)
      window.removeEventListener(this.eventType[1], this.evHandler.up, false);
    if (this.evHandler.drag)
      window.removeEventListener(this.eventType[2], this.evHandler.drag, false);
    for (var n in this.evHandler) {
      this.evHandler[n] = null;
    }
  }
})(this);