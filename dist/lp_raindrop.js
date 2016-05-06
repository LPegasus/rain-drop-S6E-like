; (function () {
  var isTouch = !!window.ontouchstart;
  function LP_RD() {
    this.version = '0.0.1';
    this.doms = [];
    this.eventType;
    this.evHandler = {};
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
  function _createRDDOM(x, y, r, color) {
    color = color || '#fff';
    var fragDOM = document.createDocumentFragment();
    var maskDOM = document.createElement('div');
    var dropDOM = document.createElement('div');
    maskDOM.classList.add('lp-rd-mask');

    dropDOM.classList.add('lp-drop');
    dropDOM.style.width = dropDOM.style.height = 2 * r + 'px';
    dropDOM.setAttribute("data-rd-radius", r);
    _resetDropDOM(dropDOM, x, y, r);
    dropDOM.style.backgroundColor = color;
    maskDOM.appendChild(dropDOM);
    return fragDOM.appendChild(maskDOM);
  }

  function _scanDomAndBindEvents(range, forceMobile) {
    isTouch = isTouch || forceMobile;
    if (range.nodeType != 9
      && range.nodeType != 1) return this;
    this.eventType = isTouch ? ['touchstart', 'touchend', 'touchmove'] : ['mousedown', 'mouseup', 'dragstart'];
    this.evHandler = { up: null, down: null, drag: null };
    window.addEventListener(this.eventType[0], this.evHandler.down = rdActionAsync(this));
    window.addEventListener(this.eventType[1], this.evHandler.up = antiRdActionAsync(this));
    window.addEventListener(this.eventType[2], this.evHandler.drag = preventDefaultDragSelect, true);
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
      _dom = _createRDDOM(x, y, r);

      var drops;
      if ((drops = Array.prototype.slice.call(tar.querySelectorAll('.lp-rd-mask')), 0).length) {
        drops.forEach(function (d) {
          d.remove();
        });
      }

      tar.appendChild(_dom);
      this.doms.push({ status: 'active', dom: _dom });
      requestAnimationFrame(function () {
        _dom.classList.add('active');
        var _rd = _dom.querySelector('.lp-drop');
        var _r = _rd.getAttribute('data-rd-radius');
        //_rd.style.transform = 'scale3d(1, 1, 1) translate3d(-' + r + 'px, -' + r + 'px,0)';
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
        _resetDropDOM(rd, null, null, 1);
        rd.addEventListener('transitionend', function (e) {
          e.currentTarget.parentElement.remove();
        });
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
    _resetPosition(rd, x, y);
    rd.style.transform = 'scale3d(' + (1 / r) + ',' + (1 / r) + ',1)';
  }

  function _clear() {
    this.dom = [];
    if (this.evHandler.down)
      window.removeEventListener(this.eventType[0], this.evHandler.down);
    if (this.evHandler.up)
      window.removeEventListener(this.eventType[1], this.evHandler.up);
    if (this.evHandler.drag)
      window.removeEventListener(this.eventType[2], this.evHandler.drag);
    for (var n in this.evHandler) {
      this.evHandler[n] = null;
    }
  }
})(this);