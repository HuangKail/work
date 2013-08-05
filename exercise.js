/*!
    this is the exercise for wandoujia.
    @Kail
    @https://github.com/HuangKail/work/blob/master/exercise.js
    @works on mordern browsers only
 */
var app = (function (){
    var requestUrl = 'http://photo-sync.herokuapp.com/photos',
        callbackParamStr = 'callback=app.photosLoaded',
        isLoading = false,
        photoCollectionModels = {
        };
    //
    // hmm... events as you expected
    //
    var events = {
        on: function (type, func) {
            var listeners;
            if (typeof func != 'function'){
                return;
            }
            if (!this.__listeners){
                this.__listeners = {};
            }
            if (!this.__listeners[type]){
                this.__listeners[type] = [];
            }
            listeners = this.__listeners[type];
            listeners.push(func);
        },
        emit: function (type) {
            var listeners,
                listener, i = 0;
            if (!this.__listeners || !this.__listeners[type]){
                return;
            }
            listeners = this.__listeners[type];
            while (listener = listeners[i++]){
                listener.apply(this, Array.prototype.slice.call(arguments, 1));
            }
        }
    };

    //
    // a string format function from tangram
    //
    var stringFormat = function(source, opts) {
        source = String(source);
        var data = Array.prototype.slice.call(arguments, 1), toString = Object.prototype.toString;
        if (data.length) {
            data = data.length == 1 ?
            /* ie 下 Object.prototype.toString.call(null) == '[object Object]' */
            (opts !== null && (/\[object Array\]|\[object Object\]/.test(toString.call(opts))) ? opts : data) : data;
            return source.replace(/#\{(.+?)\}/g, function(match, key) {
                var replacer = data[key];
                // chrome 下 typeof /a/ == 'function'
                if ('[object Function]' == toString.call(replacer)) {
                    replacer = replacer(key);
                }
                return ('undefined' == typeof replacer ? '' : replacer);
            });
        }
        return source;
    };

    //
    // the group function
    //
    function group(photos) {
        var photo, i = 0,
            day, year, month,
            date,
            newDate,
            returnData = {},
            photoGroup;
        while (photo = photos[i++]){
            newDate = new Date(photo.time);
            day = newDate.getDate();
            month = newDate.getMonth();
            year = newDate.getFullYear();
            date = year + '-' + month + '-' + day;

            if (!returnData[date]){
                returnData[date] = [];
            }
            photoGroup =  returnData[date];

            photoGroup.push(photo);
        }

        return returnData;
    }

    //
    // if originalSize is available,
    // it doesnt need to wait for img onload
    //
    function resizeImg (imgEle, originalSize, demandedSize) {
        var height = originalSize.height,
            width = originalSize.width,
            demWidth = demandedSize.width,
            demHeight = demandedSize.height,
            ratio = width / height,
            updatedWidthAccordingToDemandedHeight = demHeight * ratio,
            updatedHeightAccordingToDemandedWidth = demWidth / ratio,
            updatingDimension,
            // againstDimensionMap = {
            //     "width": "height",
            //     "height": "width"
            // }, againstDim,
            updatingValue,
            alignProperty = {
                "height": "margin-left",
                "width": "margin-top"
            },
            offsetValue;

        if (updatedWidthAccordingToDemandedHeight <= demWidth) {
            updatingDimension = 'height';
            offsetValue = Math.floor((updatedWidthAccordingToDemandedHeight - demWidth) / 2);
        }
        else {
            updatingDimension = 'width';
            offsetValue = Math.floor((updatedHeightAccordingToDemandedWidth - demHeight) / 2);
        }
        updatingValue = demandedSize[updatingDimension];
        imgEle.style[updatingDimension] = updatingValue + 'px';
        // againstDim = againstDimensionMap[updatingDimension];

        if (updatingValue > originalSize[updatingDimension] && offsetValue > 0) {
            imgEle.style[alignProperty[updatingDimension]] = -offsetValue + 'px';
        }
    }

    function loadPhotos () {
        var script;

        if (isLoading){
            return;
        }

        script = document.createElement('script');
        script.src = requestUrl + (requestUrl.indexOf('?') > -1 ? '&' : '?') + callbackParamStr;

        script.onload = function (){
            script.onload = null;
            if (script.remove){
                script.remove();
            }
            else{
                script.parentNode.remove(script);
            }
        };

        ((document.getElementsByTagName('script')[0] && document.getElementsByTagName('script')[0].parentNode)  ||
          document.getElementsByTagName('head')[0] ||
          document.getElementsByTagName('body')[0]
        ).appendChild(script);

        isLoading = true;
        scroller.end();
    }

    function photosLoadedHandler (data) {
        var groupedPhotos = group(data.photos),
            name,
            photoCollectionModel;

        // console.log(groupedPhotos);
        for (name in groupedPhotos){
            // console.log(name);
            if (groupedPhotos.hasOwnProperty(name)){
                addNewPhotoItms(name, groupedPhotos[name]);
            }
        }
        requestUrl = data.nextURL;

        if (!data.nextURL){
            scroller.end();
        }
        else{
            scroller.start();
        }
        isLoading = false;
        // console.log(photoCollectionModels);
    }

    function addNewPhotoItms (name, groupedPhotos) {
        var photoCollectionModel,
            photoCollCtr = PhotoCollectionController;
        if (!photoCollectionModels[name]){
            photoCollectionModels[name] = new PhotoCollectionModel(name);
            photoCollCtr = new PhotoCollectionController(photoCollectionModels[name]);
            photoCollCtr.appendTo(document.querySelector('#ctn'));
        }
        photoCollectionModel = photoCollectionModels[name];
        photoCollectionModel.loadData(groupedPhotos);
    }

    function PhotoCollectionModel (name) {
        this.name = name;
        this.datas = [];
        this.loadedDatas = {};
    }
    PhotoCollectionModel.prototype = {
        constructor: PhotoCollectionModel,
        loadData: function (datas) {
            var i = 0, data,
                addedItems = [],
                id;

            while(data = datas[i]){
                id = data.id;
                if (!this.loadedDatas[data.id]){
                    addedItems.push(i);
                    this.loadedDatas[id] = 1;
                    this.datas.push(data);
                }
                i++;
            }
            if (addedItems.length) {
                this.emit('addedItems', {
                    data: addedItems
                });
            }
        },
        on: events.on,
        emit: events.emit
    };

    function PhotoCollectionController (model) {
        var itemsStr = '',
            that = this;
        this.tpl = '<div class="mod-photos-coll"><div class="title"><h3 class="date">#{name}</div></h3><div class="ctn"></div></div>';
        this.itemTpl = '<div class="photo-box"><img src="#{src}" class="img-notready" data-idx="#{idx}"/></div>';
        this.model = model;
        this.el = document.createElement('div');
        this.el.innerHTML = stringFormat(this.tpl, {
            name: this.model.name
        });

        this.renderNewItems = function (evt) {
            var datas = evt.data, i = 0,
                idx, data;
            while (typeof (idx = datas[i++]) == 'number') {
                data = that.model.datas[idx];
                itemsStr += stringFormat(that.itemTpl, {
                    src: data.imageURL,
                    idx: idx
                });
            }
            that.el.querySelector('.ctn').innerHTML += itemsStr;
            Array.prototype.forEach.call(that.el.querySelectorAll('.img-notready'), that.resizeImg);
        };

        this.resizeImg = function (ele, idx) {
            var dataIdx = ele.getAttribute('data-idx'),
                width = that.model.datas[dataIdx].width,
                height = that.model.datas[dataIdx].height;
            resizeImg(ele, {width: width, height: height}, {width: 160, height: 160});
            ele.className = ele.className.replace('img-notready', '');
        };
        this.bindEvents();
    }
    PhotoCollectionController.prototype = {
        constructor: PhotoCollectionController,
        on: events.on,
        emit: events.emit,
        bindEvents: function () {
            this.model.on('addedItems', this.renderNewItems);
        },
        appendTo: function (ele) {
            ele.appendChild(this.el);
        }
    };

    function run () {
        // var photoUrl = 'http://photo-sync.herokuapp.com/photos'
        loadPhotos();
    }

    var scroller = {
        timer: null,
        optimizedType: 'throttle',
        duration: 300,
        previousLoadScrollTop: 0,
        start: function () {
            window.addEventListener('scroll', this[this.optimizedType]);
        },
        end: function () {
            if (this.timer){
                clearTimeout(this.timer);
            }
            window.removeEventListener('scroll', this[this.optimizedType]);
        },
        throttle: function () {
            if (!scroller.timer) {
                scroller.startTime = new Date();
                scroller.timer = setTimeout(scroller.act, scroller.duration);
            }
        },
        debounce: function () {
            if (!scroller.timer){
                clearTimeout(scroller.timer);
            }
            scroller.timer = setTimeout(scroller.act, scroller.duration);
        },
        act: function () {
            var doc = document,
                screenHeight = doc.documentElement.scrollHeight || doc.body.scrollHeight,
                scrollTop = doc.documentElement.scrollTop || doc.body.scrollTop;

            scroller.timer = null;
            if (scroller.previousLoadScrollTop > scrollTop || screenHeight - scrollTop > screenHeight / 5) {
                return ;
            }
            else{
                loadPhotos();
            }
        }
    }

    return {
        group: group,
        resize: resizeImg,
        loadPhotos: loadPhotos,
        photosLoaded: photosLoadedHandler,
        run: run
    }
})();
app.run();
