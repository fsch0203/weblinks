var version = "Version 0.1.0";
var _liststart = 0; //start record in query: 0 for first batch, 1 for the rest
var _lg;
var _lastScrollTop = 0;
var _activemode = 'list'; // list or edit
var _selectprivate = ''; //home, work or other, as input for select
// var _selectrating = 'star';
var _selectcat = '';
var _selecttag = '';
var _selectdue = '';
var _activeid; //id of selected row
var _locale;
var _bm_file = 'weblinks123.json';
var _emptytrash = false;
var _awes; //instance of Awesomplete
var _run_as = 'web';
var _settings = {};


/**********************************************
 *  Synchronization (shaarli.js and gdrive.js)
 *  1.  get records from server
 *      getshaarlidb()
 *      getgdrivedb()
 *  2.  update records with server
 *      updateshaarlidb()
 *      getgdrivedb()
 *  3.  remove records from server
 *      removefromshaarli()
 *      getgdrive() where _emptytrash === true
 *********************************************/

function getdata() { //first action after gapi-script is loaded
    init();
    setWindow();
    var json = localStorage.getItem("bmjson");
    // console.log(`${json}`);
    if (json) {
        Select(0);
        console.log('data from local storage');
    } else if (_settings.syncmethod === 'shaarli') {
        getshaarlidb(); //try to get data from server
        console.log('try to get data from shaarli-server');
    } else if (_settings.syncmethod === 'gdrive') {
        getgdrivedb('update');
    } else {
        getstartdata();
        console.log('startdata');
    }
}

function init() {
    _settings = JSON.parse(localStorage.getItem('settings'));
    if (_settings) {
        //..
    } else {
        _settings = { //global variables that are stored in localstorage
            screenx: 1300, //position window
            screeny: 100,
            screenw: 600,
            screenh: 900,
            syncmethod: 'shaarli',
            shaarliurl: "https://weblinks.scriptel.nl/shaarli-demo/",
            shaarlisecret: "e25379560c99",
            lastsync: '0',
            locale: 'us',
            private: 'public', //or private
            bmlimit: 1000,
            listbatch: 100,
            setupdated: 'lastused', //set the updated-field to now after weblink is selected or after it is 'edited'
            listorder: 'stars-updated' //list order: 1.stars, 2.updated or 1.updated ('updated')
        };
        localStorage.setItem('settings', JSON.stringify(_settings));
    }
    try {
        var manifest = chrome.runtime.getManifest(); //OK for ext
        _run_as = manifest.name.slice(-3).toLowerCase(); //get last 3 characters of name (='ext')
        version = manifest.version;
    } catch (err) {
        //run_as = 'web';
    }
    if (_run_as === 'ext') {
        _settings.syncmethod = 'shaarli'
    }
}

_settings.locale = detectLanguage();
// _settings.locale = "us";
// _locale = 'nl-NL'; // #### to be deleted
setLanguage(_settings.locale);

function setWindow() {
    window.moveTo(_settings.screenx, _settings.screeny);
    self.resizeTo(_settings.screenw, _settings.screenh);
}

function initSync() { //after any change: initiate sync with GD
    console.log('_restartSync in 10 sec');
    let restartSync;
    clearTimeout(restartSync);
    restartSync = setTimeout(function () {
        if (_settings.syncmethod === 'shaarli') {
            updateshaarlidb();
        } else if (_settings.syncmethod === 'gdrive') {
            getgdrivedb();
        }
    }, 2000);
}

function getstartdata() { //get default data; called if getshaarlidb catches error
    $.getJSON('./res/files/weblinks.json', function (records) { // in shaarli format
        shaarli2bmdb(records);
    });
}

function saveWindowPosition() { //activated after redrawweblinks or hasscrolled
    _settings.screenx = window.screenX; //position is saved after every calculation
    _settings.screeny = window.screenY;
    _settings.screenw = window.outerWidth;
    _settings.screenh = window.outerHeight;
    localStorage.setItem('settings', JSON.stringify(_settings));
}

function getChromeWebLinks() {
    chrome.weblinks.getTree(function (itemTree) {
        itemTree.forEach(function (item) {
            processNode(item);
        });
    });

    function processNode(node) {
        // recursively process child nodes
        if (node.children) {
            // console.log(`${node.title}`);
            node.children.forEach(function (child) {
                processNode(child);
            });
        }
        // print leaf nodes URLs to console
        if (node.url) {
            // console.log(`${node.parentId} ${date2LocalString(new Date(node.dateAdded))} ${node.url}`); 
        }
    }
}

function makenewweblink() { //new button from main screen
    w3_close();
    _activeid = '';
    editweblink(-1);
}

function showtagcloud() {
    _activemode = 'tagcloud';
    w3_close();
    $('#tagcloud').show();
    $("#btn-canceltagcloud").html(_lg.Cancel);
    $.fn.tagcloud.defaults = {
        size: {
            start: 10,
            end: 18,
            unit: 'pt'
        },
        color: {
            start: '#555',
            end: '#EE680F'
        }
    };
    var list = '';
    var tagsjson = JSON.parse(localStorage.getItem('tagsjson'));
    var tags = tagsjson.sort(fieldSorter(['label']));
    tags.forEach((tag) => {
        let count = tag.count;
        count = Math.floor(Math.log2(count)) + 1;
        list += '<a class="tagcloudtags" href=# rel=' + count + '>' + tag.label + ' </a>'
    });
    $("#tagcloudtags").html(list);
    $('#tagcloudtags a').tagcloud();
    $(".tagcloudtags").on('click', function () {
        let txt = $(this).text();
        $('#tagcloud').hide();
        _selecttag = txt.trim();
        $("#gettagcloud").text(_selecttag).addClass('bottombar');
        Select(0);
    });
}

function date2LocalString(date) {
    var dd = date.toLocaleString(_locale, {
        weekday: 'short',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
    });
    return dd;
}

function getNewUrl() { //only for extension: copy url from last visited tab
    let windowId = parseInt(localStorage.getItem('windowId'));
    chrome.tabs.query({
            'active': true
        },
        function (tabs) {
            tabs.forEach((tab) => {
                let exp = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;
                let regex = new RegExp(exp);
                let n = tab.url.search('mail.');
                if (tab.active == true && tab.url.match(regex) && tab.windowId == windowId && n < 0) {
                    $("#ipt-title").val(tab.title);
                    $("#ipt-url").val(tab.url);
                }
            });
        }
    );
}

function editweblink(id) { //show/edit selected weblink
    var bmjson = JSON.parse(localStorage.getItem('bmjson'));
    var tagsjson = JSON.parse(localStorage.getItem('tagsjson'));
    var categoriesjson = JSON.parse(localStorage.getItem('categoriesjson'));
    _activemode = 'edit';
    w3_close();
    $('#lbl-url').text(_lg.lblurl); //TODO: make translations for labels
    $('#lbl-title').text(_lg.lbltitle);
    $('#lbl-description').text(_lg.lbldescription);
    $('#lbl-category').text(_lg.lblcategory);
    $('#lbl-tags').text(_lg.lbltags);
    $('#lbl-private').text(_lg.lblprivate);
    $('#lbl-rating').text(_lg.lblrating);
    $('#lbl-rating').text(_lg.lblrating);
    $('#lbl-created').text(_lg.lblcreated);
    $('#lbl-updated').text(_lg.lblupdated);
    $('#editweblink').show();
    $("#ipt-url").focus();
    id = parseInt(id);
    var d = new Date();
    if (id == -1) { //new record
        let random = Math.floor(Math.random() * 1e13); //large integer
        $("#ipt-id").val(random); //hidden
        $("#ipt-private").prop("checked", (_settings.private.toLocaleLowerCase() === 'private'));
        $("#ipt-created").val(''); //hidden
        $("#ipt-url").val('');
        $("#ipt-title").val('');
        $("#ipt-description").val('');
        $("#ipt-tags").val('');
        $("#ipt-category").val('');
        $('#ipt-rating').starRating('setRating', 0, true)
        $('.ratingzero').html('');
        var d = new Date();
        $("#lbl-created").text(`${_lg.lblcreated}: ${date2LocalString(d)}, `);
        $("#lbl-updated").text(`${_lg.lblupdated}: ${date2LocalString(d)}`);
        if (_run_as === 'ext') getNewUrl();
    } else {
        var objIndex = bmjson.findIndex((obj => obj.id == id)); // finds index of existing record
        var weblink = bmjson[objIndex];
        $("#ipt-id").val(id); //hidden
        $("#ipt-created").val(weblink.created); //hidden
        $("#ipt-url").val(weblink.url);
        $("#ipt-title").val(weblink.title);
        $("#ipt-description").val(weblink.description);
        $("#ipt-tags").val(weblink.tags);
        $("#ipt-category").val(weblink.category);
        if (weblink.category === '_trash') $("#lbl-category").html(_lg.lblcategorytrash);
        if (weblink.rating > 0) {
            $('#ipt-rating').starRating('setRating', weblink.rating, true);
            $('.ratingzero').html('X');
        } else {
            $('#ipt-rating').starRating('setRating', 0, true)
            $('.ratingzero').html('');
        }
        var dc = new Date(weblink.created);
        var du = new Date(weblink.updated);
        $("#lbl-created").text(`${_lg.lblcreated}: ${date2LocalString(dc)}, `);
        $("#lbl-updated").text(`${_lg.lblupdated}: ${date2LocalString(du)}`);
        let private = (weblink.private.toLowerCase() === 'private');
        $("#ipt-private").prop("checked", private);
    }
    $("#btn-deleteweblink").text(_lg.Delete);
    $("#btn-saveweblink").text(_lg.Save);
    $("#btn-cancelweblink").html(_lg.Cancel);
    var catarr = [];
    categoriesjson.forEach((cat) => catarr.push(cat.label));
    var input = document.getElementById("ipt-category");
    new Awesomplete(input, {
        minChars: 1,
        autoFirst: true,
        list: catarr
    });
    var tagarr = [];
    tagsjson.forEach((tag) => tagarr.push(tag.label));
    _awes = new Awesomplete('input[data-multiple]', { //data-multiple attribute in tags-field
        minChars: 1,
        list: tagarr,
        autoFirst: true,
        filter: function (text, input) {
            // console.log(`Awesomeplete filter: ${text}`);
            return Awesomplete.FILTER_CONTAINS(text, input.match(/[^ ]*$/)[0]);
        },
        item: function (text, input) {
            // console.log(`Awesomeplete item: ${text}`);
            return Awesomplete.ITEM(text, input.match(/[^ ]*$/)[0]);
        },
        replace: function (text) {
            var before = this.input.value.match(/^.+ \s*|/)[0];
            this.input.value = before + text + " ";
            // console.log(`Awesomeplete replace: ${this.input.value}`);
        }
    });
}

function date2iso8601(d) { //date object
    let tz = d.getTimezoneOffset() / -60;
    d.setHours(d.getHours() + tz);
    // console.log('d '+d);
    let now = d.toISOString().slice(0, 19);
    if (tz < 0) {
        if (tz <= -10) {
            tz = tz + ':00';
        } else {
            tz = '-0' + tz.slice(1) + ':00';
        }
    } else {
        if (tz >= 10) {
            tz = '+' + tz + ':00';
        } else {
            tz = '+0' + tz + ':00';
        }
    }
    return now + tz;
}

function saveweblink() { //save to localStorage, not yet to shaarli-server
    var title = $("#ipt-title").val(); //no html-codes are saved in title
    if (title.length > 0) {
        let id = $("#ipt-id").val();
        id = parseInt(id);
        let created = $("#ipt-created").val();
        let updated = date2iso8601(new Date());
        created = (created.length < 5) ? updated : created;
        let url = $("#ipt-url").val();
        let ur = new URL(url);
        url = `${ur.hostname}${ur.pathname}`; //cleanup url
        let description = $("#ipt-description").val();
        let tags = $("#ipt-tags").val();
        let category = $("#ipt-category").val();
        let rating = $("#ipt-rating").starRating('getRating');
        let private = ($("#ipt-private").prop('checked')) ? 'private' : 'public';
        tags = tags.replace(/,/g, ' '); //all commas to space
        tags = tags.replace(/ +(?= )/g, ''); //reduce multiple spaces to one space
        var weblink = {
            id: id,
            url: url,
            title: title,
            description: description,
            tags: tags,
            private: private,
            created: created,
            updated: updated,
            category: category,
            rating: rating
        };
        if (category) {
            var categoriesjson = JSON.parse(localStorage.getItem('categoriesjson'));
            objIndex = categoriesjson.findIndex((obj => obj.label == category));
            if (objIndex < 0) {
                categoriesjson.push({
                    label: category
                });
                localStorage.setItem('categoriesjson', JSON.stringify(categoriesjson));
            }
        }
        tagsarr = tags.split(' ');
        if (tagsarr.length > 0) {
            var tagsjson = JSON.parse(localStorage.getItem('tagsjson'));
            tagsarr.forEach((tag) => {
                objIndex = tagsjson.findIndex((obj => obj.label == tag));
                if (objIndex < 0) {
                    tagsjson.push({
                        label: tag
                    });
                    localStorage.setItem('tagsjson', JSON.stringify(tagsjson));
                }
            });
        }
        var bmjson = JSON.parse(localStorage.getItem('bmjson'));
        objIndex = bmjson.findIndex((obj => obj.id == id));
        if (objIndex > -1) {
            bmjson[objIndex] = weblink;
        } else {
            bmjson.push(weblink);
        }
        localStorage.setItem('bmjson', JSON.stringify(bmjson));
        console.log('weblink saved: ' + JSON.stringify(weblink));
        Select(0);
        initSync();
    } else {
        // alert("Please enter title to save");
    }
}

function updateRating(rating) { //update rating of playing station
    if (rating > 0) {
        console.log('rating set: ' + rating);
        $('.ratingzero').html('X');
    } else { //no longer favorit
        console.log('rating set: ' + rating);
        $('.ratingzero').html('');
    }
}

function deleteweblink() {
    let id = $("#ipt-id").val();
    id = parseInt(id);
    let updated = date2iso8601(new Date());
    var bmjson = JSON.parse(localStorage.getItem('bmjson'));
    objIndex = bmjson.findIndex((obj => obj.id == id));
    bmjson[objIndex].category = '_trash';
    bmjson[objIndex].updated = updated;
    localStorage.setItem('bmjson', JSON.stringify(bmjson));
    var st = $("#box0").scrollTop(); //present position
    alertmessage('Weblink moved to trash')
    Select(0);
    if (st > 59.3 * _settings.listbatch) Select(1);
    $('html, body, #box0').animate({
        scrollTop: st
    }, 300);
}

function showTrash() {
    var bmjson = JSON.parse(localStorage.getItem('bmjson'));
    var weblinks = bmjson.filter((item) => {
        return (item.category == '_trash');
    });
    weblinks = weblinks.sort(fieldSorter(['-rating', '-updated']));
    redrawWebLinks(weblinks);
}

const fieldSorter = (fields) => (a, b) => fields.map(o => { //sorts array of objects
    // e.g.: const sortedHomes = homes.sort(fieldSorter(['state', '-price'])); see t.ly/JgRb2
    let dir = 1;
    if (o[0] === '-') {
        dir = -1;
        o = o.substring(1);
    }
    return a[o] > b[o] ? dir : a[o] < b[o] ? -(dir) : 0;
}).reduce((p, n) => p ? p : n, 0);

function Select(n) { //n=0 for first batch, n=1 for the rest
    var bmjson = JSON.parse(localStorage.getItem('bmjson'));
    bmdb = TAFFY(bmjson);
    var filter = $("#myFilter").val(); //quick search
    // var order = (_selectrating === 'star') ? 'rating desc, updated desc' : 'updated desc';
    var order = (_settings.listorder === 'stars-updated') ? 'rating desc, updated desc' : 'updated desc';
    weblinks = bmdb({
            category: {
                likenocase: _selectcat
            }
        }, {
            category: {
                '!is': '_trash'
            }
        }, {
            tags: { //TODO: not always correct, e.g. uit in buit
                likenocase: _selecttag
            }
        }, {
            private: {
                likenocase: _selectprivate
            }
        }, {
            updated: {
                gt: _selectdue
            }
        },
        [{
            title: {
                likenocase: filter
            }
        }, {
            description: {
                likenocase: filter
            }
        }, {
            category: {
                likenocase: filter
            }
        }, {
            tags: {
                likenocase: filter
            }
        }]).order(order).get();
    let bmlength = weblinks.length;
    if (bmlength > _settings.listbatch && n === 0) {
        $('#listend').text(`Show more (in total ${bmlength} links)`);
    } else {
        $('#listend').text('');
    }
    let bmfirst = weblinks.slice(0, _settings.listbatch);
    bmlength = bmfirst.length;
    if (n === 0) {
        console.log(`(first) ${bmlength} bms ready for redrawWebLinks`);
        _liststart = 0;
        redrawWebLinks(bmfirst);
        redrawMenu();
    } else {
        console.log('rest bms');
        _liststart = 1;
        let bmrest = weblinks.slice(_settings.listbatch);
        redrawWebLinks(bmrest);
        redrawMenu();

    }
    redrawMenu();
}

function redrawWebLinks(weblinks) { //make list after query (Select())
    saveWindowPosition();
    var list = '';
    var d, dd;
    weblinks.forEach(function (weblink, idx) {
        _activeid = (idx == 0) ? weblink.id : _activeid; //CHECK
        d = new Date(weblink.updated); //TODO: also look at updated
        dd = d.toLocaleString(_locale, {
            // weekday: 'short',
            year: 'numeric',
            month: 'numeric',
            day: 'numeric'
        });
        let private = weblink.private.toLowerCase();
        let rating = '';
        if (weblink.rating > 0) {
            rating = `<span class="label-small">
                <img src="./res/img/${weblink.rating}star.png" width="60" style="vertical-align:top">
                </span>`
        }
        let edit = `<span class="edit-icon"><img src="./res/img/edit.png" width="30"></span>`
        var tags = weblink.tags.split(' '); //make array
        var tagstr = (tags[0]) ? ` <tag>${tags.join('</tag> <tag>')}</tag>` : ``;
        var catstr = (weblink.category) ? ` <cat>${weblink.category}</cat>` : ``;
        idx = (_liststart === 0) ? idx + 1 : _settings.listbatch + idx + 1;
        list += `<tr class="row-${private}">
            <td nowrap class="td-left"><a href="#" class="showqr">
            <span class="weblinkfavicon"></span><br>
            <qrcode><img class="qrcode-img" src="./res/img/qrcode.png"></qrcode></a>
            </td>
            <td nowrap class="td-center">
            <span class="spanwithid"style="display:none">${weblink.id}</span>${rating}&nbsp
            <span class="label-small" style="padding-left:10px;float:right">${catstr}${tagstr}</span>
            <a href="${weblink.url}" class="openweblink" target="_blank" style="display:block;">
            <span class="weblinktitle">
            ${weblink.title}</span><br>
            <span class="label-small">
            ${weblink.url.substring(0, 80)}</span></a></td>
            <td class="td-right"><span style="display:none";>
            ${weblink.id}</span>${edit}</tr>;`
    });
    if (_liststart === 0) {
        $('#activelist').html(list);
    } else {
        $('#activelist').append(list);
    }
    if (_activeid && _liststart == 0) {
        $('tr:has(td:contains("' + _activeid + '"))').addClass("fs-gray");
    } else {
        $("#activelist tr:first-child").addClass("fs-gray");
        _activeid = $("#activelist tr:first-child").text().substr(0, 24);;
    }
    _activemode = 'list';
    $("#activelist").focus();
    $("tag").on('click', function () {
        let txt = $(this).text();
        _selecttag = txt.trim();
        $("#gettagcloud").text(_selecttag).addClass('bottombar');
        Select(0);
    });
    $("cat").on('click', function () {
        let txt = $(this).text();
        _selectcat = txt.trim();
        $("#catselect").text(_selectcat).addClass('bottombar');
        Select(0);
    });
    $("#activelist tr td:nth-child(1)").on('click', function () { //show qrcode
        _activeid = $(this).next().find("span").first().text();
        let url = $(this).closest('tr').find(".openweblink").attr('href');
        let ur = new URL(url);
        url = `${ur.hostname}${ur.pathname}`; //cleanup url
        // console.log(`${url}`);
        var qr = new QRious({
            element: document.getElementById('qrious'),
            value: url,
            size: 300
        })
        $('#qrcode-window').show();
        $('#qrcode-window').on('click', function () {
            $('#qrcode-window').hide();
        });
        $("#activelist tr").removeClass("fs-gray");
        $(this).closest("tr").addClass("fs-gray");
    });
    $("#activelist tr td:nth-child(2)").on('click', function () { //goto weblink
        _activeid = $(this).find("span").first().text();
        $("#activelist tr").removeClass("fs-gray");
        $(this).closest("tr").addClass("fs-gray");
        if (_settings.setupdated === 'lastused') {
            let updated = date2iso8601(new Date());
            var bmjson = JSON.parse(localStorage.getItem('bmjson'));
            objIndex = bmjson.findIndex((obj => obj.id == _activeid));
            bmjson[objIndex].updated = updated;
            localStorage.setItem('bmjson', JSON.stringify(bmjson));
            // $('html, body, #box0').scrollTop(0);
            $('#box0').scrollTop(0);
            initSync();
        }
    });
    $("#activelist tr td:nth-child(3)").on('click', function () { //select weblink to view/edit
        _activeid = $(this).prev().find("span").first().text();
        $("#activelist tr").removeClass("fs-gray");
        $(this).closest("tr").addClass("fs-gray");
        console.log('edit _activeid: ' + _activeid);
        editweblink(_activeid);
    });
    $("a[href^='http']").each(function () {
        $(this).closest('tr').find('.weblinkfavicon').css({
            background: "url(https://s2.googleusercontent.com/s2/favicons?domain_url=" + this.hostname + ") left top no-repeat"
        });
    });
}

function redrawMenu() { //update menu after changes in weblinks
    // console.log('redrawMenu started');
    let t = '<a href="#" class="w3-bar-item w3-button querycategory">' + _lg.getall + '</a>';
    var categoriesjson = JSON.parse(localStorage.getItem('categoriesjson'));
    categoriesjson = $.grep(categoriesjson, (function (record, i) {
        return record.label != '_trash';
    }));
    categoriesjson = categoriesjson.sort(fieldSorter(['label']));
    categoriesjson.forEach((cat) => {
        t += '<a href="#" class="w3-bar-item w3-button querycategory">' + cat.label + '</a>'
    });
    $("#catselectelements").html(t); //replace tags in menu
    $(".querycategory").click(function () { // Input for query from menu bar
        // console.log(`${event.target.id}`);
        _selectcat = $(this).text();
        console.log('_selectcat' + _selectcat);
        $("#catselectelements").removeClass('w3-show');
        if (_selectcat === _lg.getall) {
            $("#catselect").text(_lg.catselect).removeClass('bottombar').removeClass('catsmenu');
            _selectcat = '';
        } else {
            $("#catselect").text(_selectcat).addClass('bottombar');
        }
        Select(0);
    });
}

function w3_open() { //sidebar open, overlay for dark background
    $("#mySidebar").show();
    $("#myOverlay").show();
}

function w3_close() {
    $("#mySidebar").hide();
    $("#myOverlay").hide();
}

function hasScrolled() { // Hide Header on on scroll down
    var navbarHeight = $('header').outerHeight();
    var delta = 5;
    var st = $("#box0").scrollTop(); //from 0 (at top) to y when scrolling down
    if (Math.abs(_lastScrollTop - st) <= delta)
        return;
    if (st > _lastScrollTop && st > navbarHeight) {
        $('header').removeClass('nav-down').addClass('nav-up');
        $('.scrollToTop').fadeIn();
        $('#addnewweblink').fadeOut();
    } else {
        $('header').removeClass('nav-up').addClass('nav-down');
        $('.scrollToTop').fadeOut();
        $('#addnewweblink').fadeIn();
    }
    _lastScrollTop = st;
    saveWindowPosition();
}

function showMessage(hd, msg) {
    $("#popupheader").html(hd);
    $("#popupmessage").html(msg);
    $("#popup01").show();
}

function showmessagebox(hd, msg, list) {
    $("#messageboxheader").html(hd);
    $("#messageboxmessage").html(msg);
    $("#messageboxlist").html(list);
    $("#messagebox").show();
}

function dateISO2csv(d) { //d in format as in bmjson
    let date = d.substr(0, 10);
    let time = d.substr(11, 8);
    return `${date} ${time}`
}

function exportweblinks(exportformat) { //TODO
    var bmjson = JSON.parse(localStorage.getItem('bmjson').replace(/\|/g, "-"));
    bmjson = bmjson.sort(fieldSorter(['-updated']));
    var filename, content;
    var today = new Date().toISOString().slice(0, 10); //format yyyy-mm-dd
    if (exportformat === 'json') {
        content = JSON.stringify(bmjson);
        filename = `weblinks-${today}.json`;
    } else if (exportformat === 'csv') {
        let title, description, created, update, c;
        content = `"id","title","url","description","category","tags","rating","private","shorturl","created","updated"\n`;
        bmjson.forEach(function (bm) {
            title = bm.title.replace(/\"/g, "\'").replace(/(\r\n|\n|\r)/g, ""); //replace " by '
            description = bm.description.replace(/\"/g, "\'").replace(/(\r\n|\n|\r)/g, "");
            created = dateISO2csv(bm.created);
            updated = dateISO2csv(bm.updated);
            content += `"${bm.id}","${title}","${bm.url}","${description}","${bm.category}","${bm.tags}","${bm.rating}",` +
                `"${bm.private}","${bm.shorturl}","${created}","${updated}"\n`
        });
        filename = `weblinks-${today}.csv`;
    }
    var blob = new Blob([content], {
        type: "text/plain;charset=utf-8"
    });
    saveAs(blob, filename);
}

function alertmessage(text) {
    alerty.toasts(text, {
        place: 'bottom',
        bgColor: 'yellow',
        fontColor: 'black',
        time: 4000
    });
}

function saveSettings() { //from settings menu
    if ($('#shaarliurl').val()) _settings.shaarliurl = $('#shaarliurl').val();
    _settings.shaarliurl = (_settings.shaarliurl.slice(-1) === '/') ? _settings.shaarliurl : _settings.shaarliurl + '/';
    if ($('#shaarlisecret').val()) _settings.shaarlisecret = $('#shaarlisecret').val();
    if ($('#ipt-bmlimit').val()) _settings.bmlimit = parseInt($('#ipt-bmlimit').val());
    if ($('#ipt-listbatch').val()) _settings.listbatch = parseInt($('#ipt-listbatch').val());
    let sm = $('input[name=syncmethod]:checked').val();
    _settings.syncmethod = (sm) ? sm : 'shaarli'
    _settings.private = ($('#set-private').is(':checked')) ? 'private' : 'public';
    _settings.setupdated = ($('#set-setupdated').is(':checked')) ? 'lastused' : 'edited';
    localStorage.setItem('settings', JSON.stringify(_settings));
}

$(document).ready(function () {
    getdata();
    showHtml();
    var didScroll;
    $("#box0").scroll(function (event) {
        didScroll = true;
    });
    setInterval(function () { //check scroll every 250ms
        if (didScroll) {
            hasScrolled();
            didScroll = false;
        }
    }, 250);
    $('#listend').click(function () {
        Select(1);
        return false;
    });
    $('.scrollToTop').click(function () {
        $('html, body, #box0').animate({
            scrollTop: 0
        }, 800);
        return false;
    });
    $("#clearsearch").hide();
    $("#open-sidebar").on('click', function () {
        w3_open();
    });
    /* Menubar ------------------------------------------------------- */
    $("#getall").click(function () { //select all weblinks
        _selectprivate = '';
        _selectcat = '';
        _selectdue = '';
        _selecttag = '';
        $("#myFilter").val('');
        $("#catselect").text(_lg.catselect).removeClass('bottombar').removeClass('privateprivatemenu');
        $("#dueselect").text(_lg.dueselect).removeClass('bottombar');
        $("#gettagcloud").text(_lg.tagselect).removeClass('bottombar');
        $("#scopeselectelements").removeClass('w3-show');
        $("#scopeselect").text(_lg.scopeselect).removeClass('bottombar').removeClass('privateprivatemenu').removeClass('privatepublicmenu');
        $("#catselectelements").removeClass('w3-show');
        $("#getall").removeClass('w3-show');
        $("#dueselectelements").removeClass('w3-show');
        Select(0);
    });
    $("#ratingselect").click(function () {
        if (_settings.listorder === 'stars-updated') {
            _settings.listorder = 'updated';
            $("#ratingselectimg").attr('src','./res/img/star-open.png');
        } else {
            _settings.listorder = 'stars-updated';
            $("#ratingselectimg").attr('src','./res/img/star-full.png');
        }
        Select(0);
        localStorage.setItem('settings', JSON.stringify(_settings));
    });
    $("#scopeselect").on('click', function () { //click on private filter
        $("#getall").removeClass('w3-show');
        $("#catselectelements").removeClass('w3-show');
        $("#dueselectelements").removeClass('w3-show');
        if ($("#scopeselectelements").hasClass('w3-show')) { //toggle menu
            $("#scopeselectelements").removeClass('w3-show');
        } else {
            $("#scopeselectelements").addClass('w3-show');
        }
    });
    $("#catselect").on('click', function () { //click on tag filter
        $("#getall").removeClass('w3-show');
        $("#scopeselectelements").removeClass('w3-show');
        $("#dueselectelements").removeClass('w3-show');
        if ($("#catselectelements").hasClass('w3-show')) { //toggle menu
            $("#catselectelements").removeClass('w3-show');
        } else {
            $("#catselectelements").addClass('w3-show');
        }
    });
    $("#dueselect").on('click', function () { //click on due filter
        $("#getall").removeClass('w3-show');
        $("#scopeselectelements").removeClass('w3-show');
        $("#catselectelements").removeClass('w3-show');
        if ($("#dueselectelements").hasClass('w3-show')) { //toggle menu
            $("#dueselectelements").removeClass('w3-show');
        } else {
            $("#dueselectelements").addClass('w3-show');
        }
    });
    $("#gettagcloud").on('click', function () {
        w3_close();
        showtagcloud();
    });
    $("#myFilter").keyup(function (event) {
        Select(0);
    });
    $(".queryscope").click(function (event) { // Input for query from menu bar
        var scopeselect = event.target.id; //id of selected element  
        // console.log('scopeselect: '+scopeselect);
        $("#scopeselectelements").removeClass('w3-show');
        if (scopeselect === 'scopeselectall') {
            $("#scopeselect").text(_lg.scopeselect).removeClass('bottombar').removeClass('privateprivatemenu').removeClass('privatepublicmenu');
            _selectprivate = '';
        } else {
            $("#scopeselect").text(_selectprivate).addClass('bottombar');
            if (scopeselect === 'scopeselectprivate') {
                _selectprivate = 'private';
                $("#scopeselect").text(_lg.privateprivate);
            } else if (scopeselect === 'scopeselectpublic') {
                _selectprivate = 'public';
                $("#scopeselect").text(_lg.privatepublic);
            }
        }
        Select(0);
    });
    $(".querywhen").click(function (event) { // Input for query from menu bar
        var selectduetext = $(this).text();
        var dueselect = event.target.id; //id of selected element  
        // var today = new Date().toISOString().slice(0, 10); //format yyyy-mm-dd
        var yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10) + 'Z';
        var weekago = new Date(Date.now() - 86400000 * 7).toISOString().slice(0, 10) + 'Z';
        var monthago = new Date(Date.now() - 86400000 * 30).toISOString().slice(0, 10) + 'Z';
        var yearago = new Date(Date.now() - 86400000 * 365).toISOString().slice(0, 10) + 'Z';
        var agesago = new Date(Date.now() - 86400000 * 365 * 20).toISOString().slice(0, 10) + 'Z';
        // console.log('agesago '+agesago);
        $("#dueselectelements").removeClass('w3-show');
        if (dueselect === 'dueselectall') {
            $("#dueselect").text(_lg.dueselect).removeClass('bottombar');
            _selectdue = agesago;
        } else if (dueselect === 'dueselecttoday') {
            $("#dueselect").text(selectduetext).addClass('bottombar');
            _selectdue = yesterday;
        } else if (dueselect === 'dueselectweek') {
            $("#dueselect").text(selectduetext).addClass('bottombar');
            _selectdue = weekago;
        } else if (dueselect === 'dueselectmonth') {
            $("#dueselect").text(selectduetext).addClass('bottombar');
            _selectdue = monthago;
        } else if (dueselect === 'dueselectyear') {
            $("#dueselect").text(selectduetext).addClass('bottombar');
            _selectdue = yearago;
        }
        Select(0);
    });
    /* Edit weblink --------------------------------------------- */
    $("#ratingzero").on('click', function () { //small area left of stars to set zero stars
        $('#ipt-rating').starRating('setRating', 0);
        updateRating(0);
    });
    $("#ipt-rating").starRating({ //user can set rating
        initialRating: 0,
        disableAfterRate: false,
        useFullStars: true,
        starSize: 20,
        callback: function (rating) {
            updateRating(rating);
        }
    });
    $('#ipt-category').focusin(function () { //give suggestion category based on tags
        if ($('#ipt-category').val() == '') {
            let tags = $('#ipt-tags').val().trim().split(' ');
            console.log(`${tags}`);
            var categoriesjson = JSON.parse(localStorage.getItem('categoriesjson'));
            let idx = -1;
            tags.forEach((tag) => {
                var objIndex = categoriesjson.findIndex((obj => obj.tags.includes(tag)));
                idx = (objIndex > -1) ? objIndex : idx;
            })
            if (idx > -1) $('#ipt-category').val(categoriesjson[idx].label);
        }
    });
    $(document).keydown(function (event) {
        if (event.which === 32 && _activemode === 'list') { //spacebar -> edit
            event.preventDefault();
            editweblink(_activeid);
        } else if (event.which === 36 && _activemode === 'list') { //home
            // console.log('home');
            var activerow = $("#activelist").find('.fs-gray').closest('tr');
            activerow.removeClass("fs-gray");
            activerow = $("#activelist tr:first-child");
            _activeid = activerow.text().substr(0, 24);
            // editweblink(_activeid);
            $('html, body, #box0').animate({ //scroll table so active row remains visible
                scrollTop: 0
            }, 300);
            activerow.addClass("fs-gray");
        } else if (event.which === 35 && _activemode === 'list') { //end
            // console.log('end');
            var activerow = $("#activelist").find('.fs-gray').closest('tr');
            activerow.removeClass("fs-gray");
            activerow = $("#activelist tr:last-child");
            var activelist = $("#activelist");
            _activeid = activerow.text().substr(0, 24);
            $('html, body, #box0').animate({ //scroll table so active row remains visible
                scrollTop: activerow.offset().top - activelist.offset().top + activelist.scrollTop() - 70
            }, 500);
            activerow.addClass("fs-gray");
        } else if (event.which === 33 && _activemode === 'list') { //page up
            var id = $("#activelist").find('.fs-gray').closest('tr').prev().text().substr(0, 24);
            if (id) { //if first row is selected nothing happens
                var activerow = $("#activelist").find('.fs-gray').closest('tr');
                activerow.removeClass("fs-gray");
                var row;
                for (let i = 0; i < 8; i++) {
                    row = activerow.prev();
                    if (row.text()) activerow = row;
                }
                activerow.addClass("fs-gray");
                _activeid = activerow.text().substr(0, 24);
                var activelist = $("#activelist");
                $('html, body, #box0').animate({ //scroll table so active row remains visible
                    scrollTop: activerow.offset().top - activelist.offset().top - $("body").height() + 180
                }, 30);
            }
        } else if (event.which === 34 && _activemode === 'list') { //page down
            var id = $("#activelist").find('.fs-gray').closest('tr').next().text().substr(0, 24);
            if (id) { //if last row is selected nothing happens
                var activerow = $("#activelist").find('.fs-gray').closest('tr');
                activerow.removeClass("fs-gray");
                var row;
                for (let i = 0; i < 8; i++) {
                    row = activerow.next();
                    if (row.text()) activerow = row;
                }
                activerow.addClass("fs-gray");
                _activeid = activerow.text().substr(0, 24);
                var activelist = $("#activelist");
                $('html, body, #box0').animate({ //scroll table so active row remains visible
                    scrollTop: activerow.offset().top - activelist.offset().top - $("body").height() + 180
                }, 30);
            }
        } else if (event.which === 38 && _activemode === 'list') { //arrow up
            var id = $("#activelist").find('.fs-gray').closest('tr').prev().find(".spanwithid").text();
            if (id) { //if first row is selected nothing happens
                var activerow = $("#activelist").find('.fs-gray').closest('tr');
                activerow.removeClass("fs-gray");
                activerow = activerow.prev();
                activerow.addClass("fs-gray");
                _activeid = id;
                var activelist = $("#activelist");
                // console.log('activerow.offset().top :'+ activerow.offset().top +' activelist.offset().top: '+ activelist.offset().top);
                $('html, body, #box0').animate({ //scroll table so active row remains visible
                    scrollTop: activerow.offset().top - activelist.offset().top - $("body").height() * 0.6
                }, 30);
            }
        } else if (event.which === 40 && _activemode === 'list') { //arrow down
            var id = $("#activelist").find('.fs-gray').closest('tr').next().find(".spanwithid").text();
            // console.log(`${id}`);
            if (id) { //if last row is selected nothing happens
                var activerow = $("#activelist").find('.fs-gray').closest('tr');
                activerow.removeClass("fs-gray");
                activerow = activerow.next();
                activerow.addClass("fs-gray");
                _activeid = id;
                var activelist = $("#activelist");
                // console.log('activerow.offset().top :'+ activerow.offset().top +' activelist.offset().top: '+ activelist.offset().top);
                $('html, body, #box0').animate({
                    scrollTop: activerow.offset().top - activelist.offset().top - $("body").height() + 300
                }, 30);
            }
        } else if (event.which === 13 && _activemode === 'list') { // enter
            var id = $("#activelist").find('.fs-gray').closest('tr').find("span").first().text();
            id = parseInt(id);
            var bmjson = JSON.parse(localStorage.getItem('bmjson'));
            objIndex = bmjson.findIndex((obj => obj.id == id));
            var bm = bmjson[objIndex]
            window.open(bm.url, '_blank');
        } else if (event.which === 116) { // F5 - reload app
            location.reload();
        } else if (event.which === 27 && _activemode === 'list') { // escape: clear searchbox
            $("#myFilter").val('');
            $("#getall").focus();
            Select(0);
        } else if (event.which === 27 && _activemode === 'edit') { // escape: cancel edit
            // $('#close-editweblink').focus();
            $('#editweblink').hide();
            _awes.destroy();
            _activemode = 'list';
        } else if (event.which === 27 && _activemode === 'tagcloud') { // escape: cancel tagcloud
            $('#tagcloud').hide();
            _activemode = 'list';
        } else if (event.which === 117 && _activemode === 'list') { // F6
            showtagcloud();
            $('#tagcloud').focus();
        } else if (event.which === 115 && _activemode === 'list') { // F4
            // _activeid = $(this).prev().find("span:first-child").text();
            console.log('_activeid ' + _activeid);
            editweblink(_activeid);
        } else if (event.which === 114 && _activemode === 'list') { // F3
            event.preventDefault();
            $("#myFilter").focus(); //search
        }
    });
    $('#btn_close').on('click', function () {
        w3_close();
    })
    $('#close-popup').on('click', function () {
        $('#popup01').hide();
    })
    $('#close-editweblink').on('click', function () {
        $('#editweblink').hide();
        _awes.destroy();
        _activemode = 'list';
    })
    $('#close-tagcloud').on('click', function () {
        $('#tagcloud').hide();
        _activemode = 'list';
        _selecttag = '';
        $("#gettagcloud").text(_lg.tagselect).removeClass('bottombar');
        Select(0);
    })
    $('#btn-saveweblink').on('click', function () { //save or update new or edited weblink
        $('#editweblink').hide();
        _awes.destroy();
        _activemode = 'list';
        saveweblink();
    });
    $('#btn-cancelweblink').on('click', function () { //save or update new or edited weblink
        $('#editweblink').hide();
        _awes.destroy();
        _activemode = 'list';
    });
    $('#btn-canceltagcloud').on('click', function () {
        $('#tagcloud').hide();
        _activemode = 'list';
    });
    $('#btn-deleteweblink').on('click', function () { //save or update new or edited weblink
        $('#editweblink').hide();
        _awes.destroy();
        _activemode = 'list';
        deleteweblink();
    });
    $("#addnewweblink").on('click', function () {
        makenewweblink();
    });
    $("#addnewweblink-but").on('click', function () {
        makenewweblink();
    });
    $('#cancelweblink').on('click', function () { //save or update new or edited weblink
        _activemode = 'list';
        Select(0);
    });
    $("#closemessagebox, #btn-messageboxright").on('click', function () {
        $("#messagebox").hide();
    });
    $("#btn-messageboxleft").on('click', function () { //OK from messagebox
        var boxtype = $("#messageboxlist").text().substr(0, 9);
        // console.log(boxtype);
        var exportformat = 'json';
        if (boxtype === 'downloadb') { //boxtype is set by $("#godownloadbox").on('click', function () etc
            exportformat = $('input[name=exportformat]:checked').val()
            exportweblinks(exportformat);
            $("#messagebox").hide();
        } else if (boxtype === 'removebox') {
            console.log('about to remove');
            if (_settings.syncmethod === 'shaarli') {
                removefromshaarli('_trash');
            } else if (_settings.syncmethod === 'gdrive') {
                _emptytrash = true;
                getgdrivedb();
            }
            $("#messagebox").hide();
            Select(0);
        } else if (boxtype === 'settings_') { //save settings
            saveSettings();
            $("#messagebox").hide();
            initSync();
        }
    });
    $("#showtrash").on('click', () => {
        w3_close();
        showTrash();
    });
    $("#closeapp").on('click', function () {
        detectLanguage(); //next time the right language setting will apply (if setting has changed)
        if (navigator.app) { //closing is necessary if user wants to apply new language settings (if changed)
            navigator.app.exitApp();
        } else if (navigator.device) {
            navigator.device.exitApp();
        } else {
            console.log('app would now close');
        }
    });
    $(".goabout").on('click', function () {
        w3_close();
        var d = new Date();
        var yyyy = d.getFullYear();
        $("#favicon").removeClass("favicon2");
        var hd = _lg.About2;
        var msg = `<p>${_lg.msg01}</p>
            <p><a href='https://weblinks.scriptel.nl' target='_blank'>weblinks.scriptel.nl</a></p>
            <br><br><p>${version}</p><p>Copyright &copy;${yyyy}, Scriptel</p><hr/>
            <p class='italic'>${_lg.msg04}</p>
            <p class='italic'>${_lg.msg05}</p><br>`
        $("#logo").show();
        $("footer").html(`<p>&nbsp;</p>`)
        showMessage(hd, msg);
    });
    $("#gosettingsbox").on('click', function () {
        w3_close();
        $("#favicon").removeClass("favicon2");
        var hd = _lg.hdSettings;
        var msg = "<p><b>" + _lg.hdShaarli + "</b><p>" + _lg.msgShaarli + "</p>";
        var boxtype = 'settings_';
        $("#btn-messageboxleft").html(_lg.OK);
        $("#btn-messageboxright").html(_lg.Cancel);
        var checkedprivate = (_settings.private === 'private') ? 'checked' : '';
        var checkedsetupdated = (_settings.setupdated === 'lastused') ? 'checked' : '';
        var list = `<span style="display:none">${boxtype}</span><p></p>`
        if (_run_as != 'ext') {
            list += `<p><label class="label-small">${_lg.lblsyncmethod}</label></p>
            <p><input class="w3-radio" type="radio" name="syncmethod" value="shaarli" >
            <label class="label-small">Shaarli</label></p>
            <p><input class="w3-radio" type="radio" name="syncmethod" value="gdrive">
            <label class="label-small">Google Drive</label></p>`
        }
        list += `<p><label class="label-small">${_lg.lblurl}</label>
            <input id="shaarliurl" class="w3-input" type="text" value="${_settings.shaarliurl}"></p>
            <p><label class="label-small">Shaarli secret</label>
            <input id="shaarlisecret" class="w3-input" type="text" value="${_settings.shaarlisecret}"></p>
            <p><label class="label-small">${_lg.lblmaxload}</label>
            <input id="ipt-bmlimit" class="w3-input" type="text" value="${_settings.bmlimit}"></p>
            <p><label class="label-small">${_lg.lblmaxshow}</label>
            <input id="ipt-listbatch" class="w3-input" type="text" value="${_settings.listbatch}"></p>
            <p><input class="w3-check" type="checkbox" ${checkedprivate} id="set-private">
            <label class="label-small">${_lg.lbldefaultprivate}</label>
            <p><input class="w3-check" type="checkbox" ${checkedsetupdated} id="set-setupdated">
            <label class="label-small">${_lg.lbldefaultsetupdated}</label>
            `;
        // '<input id="ipt-listbatch" class="w3-input" type="text" value="' + _settings.listbatch + '"></p>';
        $("#logo").show();
        showmessagebox(hd, msg, list);
        $('input:radio[name="syncmethod"]').filter(`[value=${_settings.syncmethod}]`).attr('checked', true);
    });
    $("#godownloadbox").on('click', function () {
        w3_close();
        $("#favicon").removeClass("favicon2");
        var hd = _lg.hdDownload;
        var msg = "<p>" + _lg.msgDownload + "</p>";
        var boxtype = 'downloadbox';
        $("#btn-messageboxleft").html(_lg.OK);
        $("#btn-messageboxright").html(_lg.Cancel);
        var list = `<span style="display:none">${boxtype}</span>
            <p><input class="w3-radio" type="radio" checked="true" name="exportformat" value="json" >
            <label class="label-small">${_lg.lbljsonformat}</p>
            <p><input class="w3-radio" type="radio" name="exportformat" value="csv">
            <label class="label-small">${_lg.lblcsvformat}</label></p>
            `;
        $("#logo").show();
        showmessagebox(hd, msg, list);
    });
    $("#getshaarli").on('click', function () {
        w3_close();
        getshaarlidb()
    });
    $("#goremovebox").on('click', function () {
        w3_close();
        $("#favicon").removeClass("favicon2");
        var hd = _lg.hdRemove;
        var msg = "<p>" + _lg.msgRemove + "</p>";
        var boxtype = 'removebox';
        $("#btn-messageboxleft").html(_lg.OK);
        $("#btn-messageboxright").html(_lg.Cancel);
        var list = '<span style="display:none">' + boxtype + '</span>';
        $("#logo").show();
        showmessagebox(hd, msg, list);
    });
    $("#goupdate").on('click', function () {
        w3_close();
        if (_settings.syncmethod === 'shaarli') {
            updateshaarlidb();
        } else if (_settings.syncmethod === 'gdrive') {
            getgdrivedb();
        }
    });
    $("#gotest").on('click', function () {
        w3_close();
        if (_run_as === 'ext') getChromeWebLinks();
    });
    $("#emptytrash").click(function () {
        emptytrash();
        w3_close();
    });
    $("#reloadapp").click(function () {
        location.reload();
    });
    $("#myFilter").on("focus", function () {
        $(".title").hide();
        $("#clearsearch").show();
        $('#myFilter').attr("placeholder", "Zoek weblinks");
    });
    $("#myFilter").on("focusout", function () {
        $('#myFilter').attr("placeholder", "");
        setTimeout(function () {
            $(".title").show();
        }, 400);
        $("#clearsearch").hide();
    });
    $("#clearsearch").on('click', function (ev) {
        $("#myFilter").val('');
        Select(0);
    });
});

//#CHECK
function detectLanguage() {
    let locale = 'us';
    if (navigator.globalization !== null && navigator.globalization !== undefined) { //Phonegap browser detection
        navigator.globalization.getPreferredLanguage(
            function (language) {
                if (locale != language.value) {
                    locale = language.value;
                    // alert('new language: '+locale);
                }
                // alert('language.value' + ': ' + language.value);
            },
            function (error) {
                // alert('error');
            }
        );
    } else { //Normal browser detection
        console.log('window.navigator.language: ' + window.navigator.language);
        if (window.navigator.language !== null && window.navigator.language !== undefined) {
            if (locale != window.navigator.language) {
                locale = window.navigator.language;
            }
        }
    }
    return locale;
}

function setLanguage(locale) {
    switch (locale) {
        case 'nl':
            // lgnr = 1; //us:0, nl:1
            _lg = translate.nl;
            break;
        case 'de':
            // lgnr = 2; //us:0, nl:1
            _lg = translate.de;
            break;
        default:
            // lgnr = 0; //us:0, nl:1
            _lg = translate.us;
            break;
    }
}

function showHtml() {
    $("#makenewweblink").html(_lg.Makenewweblink);
    $("#goeditweblinks").html(_lg.editweblink);
    $("#closeapp").html(_lg.closeapp);
    $("#goabout").html(_lg.About1);
    $("#lb-homeurl").html(_lg.homeurl);
    $("#lb-language").html(_lg.Language);
    $("#titleapp").html(_lg.titleapp);
    $("#titleeditform").html(_lg.editweblink);
    $("#favicon").html(_lg.Favicon);
    $("#contnewweblink").html(_lg.New);
    $("#deleteweblink").html(_lg.Delete);
    $("#saveweblink").text(_lg.Save);
    $("#cancelweblink").html(_lg.Cancel);
    $("#editweblinks").html(_lg.editweblinks);
    $("#myFilter").attr("placeholder", _lg.Searchfor);
    $("#getall, #getactionall, #scopeselectall, #dueselectall").html(_lg.getall);
    $("#getall").css("font-weight", "Bold");
    $("#scopeselect").html(_lg.scopeselect);
    $("#scopeselectprivate").html(_lg.privateprivate);
    $("#scopeselectpublic").html(_lg.privatepublic);
    $(".privateprivatemenu").html(_lg.privateprivate);
    $(".privatepublicmenu").html(_lg.privatepublic);
    $("#dueselect").html(_lg.dueselect);
    $("#dueselecttoday").html(_lg.dueselecttoday);
    $("#dueselectweek").html(_lg.dueselectweek);
    $("#dueselectmonth").html(_lg.dueselectmonth);
    $("#dueselectyear").html(_lg.dueselectyear);
    $("#catselect").html(_lg.catselect);
    $("#reloadapp").html(_lg.reloadapp);
    $("#gosettingsbox").html(_lg.gosettingsbox);
    $("#goremovebox").html(_lg.goremovebox);
    $("#showtrash").html(_lg.showtrash);
    $("#titletagcloud").html(_lg.titletagcloud);
    let star = (_settings.listorder === 'stars-updated') ? 'full' : 'open';
    $("#ratingselectimg").attr('src',`./res/img/star-${star}.png`);
}