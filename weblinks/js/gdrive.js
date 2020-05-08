var CLIENT_ID = '947617816205-mjefkgnmnqn46vs9qhs174p5ctjstoig.apps.googleusercontent.com';
var API_KEY = 'AIzaSyCiyfyWCbXt5cd5ujXhNOmdCPOQoS13yUE'; // API-key not needed for access
var DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
var SCOPES = 'https://www.googleapis.com/auth/drive.metadata.readonly';

// function handleClientLoad() { //On load, called to load the auth2 library and API client library.
function getgdrivedb() { //On load, called to load the auth2 library and API client library.
    gapi.load('client:auth2', initClient);
}

function initClient() { //Initializes the API client library and sets up sign-in state listeners
    gapi.client.init({
        // apiKey: API_KEY,
        clientId: CLIENT_ID,
        discoveryDocs: DISCOVERY_DOCS,
        scope: SCOPES
    }).then(function () {
        gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus); // Listen for sign-in state changes.
        updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get()); // Handle the initial sign-in state.
    }, function (error) {
        console.log(JSON.stringify(error, null, 2));
    });
}

function updateSigninStatus(isSignedIn) {
    $('#syncing').show();
    if (isSignedIn) { //user is signedin
        getMetaData(_bm_file, (data) => {
            if (data) {
                console.log(`metadata: ${JSON.stringify(data)}`);
                getFileContent(data.id, (file) => {
                    if (file) syncContentGD(file);
                })
            } else { //no file on GDrive yet
                console.log(`no file on gdrive`);
                saveFile2GD(_bm_file, JSON.stringify(bmjson));
                _settings.lastsync = new Date();
                localStorage.setItem('settings', JSON.stringify(_settings));
                $('#syncing').hide();
            }
        });
    } else { //user is signedoff
        gapi.auth2.getAuthInstance().signIn();
    }
}

function syncContentGD(file) {
    var bmjson = JSON.parse(localStorage.getItem('bmjson'));
    bmjson = (bmjson == null) ? '' : bmjson;
    var updatedcount = 0;
    var removecount = 0;
    let ls = date2iso8601(new Date(_settings.lastsync));
    // console.log(`${file.content}`);
    let bmGDjson = JSON.parse(file.content).sort(fieldSorter(['-id']));
    let highestId = bmGDjson[0].id;
    console.log(`highest id: ${bmGDjson[0].id}`);
    if (bmjson) {
        var updatedbms = $.grep(bmjson, ((record, i) => {
            return record.updated > ls;
        })); //updated records: change since last sync
        updatedcount = updatedbms.length;
        updatedbms.forEach((updatedbm, idx) => {
            var objIndex, objIndexGD;
            if (updatedbm.id < 10000) { //change existing record
                objIndex = bmjson.findIndex((obj => obj.id == updatedbm.id));
                objIndexGD = bmGDjson.findIndex((obj => obj.id == updatedbm.id));
                if (objIndex > -1 && objIndexGD > -1) bmGDjson[objIndexGD] = bmjson[objIndex];
            } else { //add new record
                objIndex = bmjson.findIndex((obj => obj.id == updatedbm.id));
                if (objIndex > -1) {
                    bmjson[objIndex].id = highestId + 1 + idx;
                    bmGDjson.push(bmjson[objIndex]);
                }
            }
        });
        if (_emptytrash) {
            var removebms = $.grep(bmjson, ((record, i) => {
                return record.category === '_trash';
            }));
            removecount = removebms.length;
            removebms.forEach((removebm) => {
                objIndexGD = bmGDjson.findIndex((obj => obj.id == removebm.id));
                if (objIndexGD > -1) bmGDjson.splice(objIndexGD, 1);
            });
        }
        _emptytrash = false;
    }
    gdrive2bmdb(bmGDjson);
    saveFile2GD(_bm_file, JSON.stringify(bmGDjson));
    _settings.lastsync = new Date();
    localStorage.setItem('settings', JSON.stringify(_settings));
    console.log(`${updatedcount} records updated`);
    // redrawWebLinks(bmjson);
    // redrawMenu();
    alertmessage(`${updatedcount} records updated and ${removecount} removed in Google Drive`);
    $('#syncing').hide();

}


function gdrive2bmdb(weblinks) { //make bmjson, tagsjson and categoriesjson
    var bmjson = weblinks;
    var tagsjson = [];
    var categoriesjson = [];
    weblinks.forEach(function (weblink) {
        let category = weblink.category;
        let tags = weblink.tags.split(' '); //array with tags
        var objIndex = categoriesjson.findIndex((obj => obj.label == category));
        if (objIndex < 0) { //new category
            categoriesjson.push({
                label: category,
                tags: tags
            });
        } else { //add tags to category if not already in
            tags.forEach((tag) => {
                if (!categoriesjson[objIndex].tags.includes(tag)) categoriesjson[objIndex].tags.push(tag);
            })
        }
        if (tags.length > 0) { //make tagsdb
            tags.forEach((tag) => {
                tag = tag.trim().toLocaleLowerCase();
                objIndex = tagsjson.findIndex((obj => obj.label == tag));
                if (objIndex > -1) { //found
                    tagsjson[objIndex].count += 1;
                } else {
                    tagsjson.push({
                        label: tag,
                        count: 1
                    });
                }
            });
        }
    });
    localStorage.setItem('bmjson', JSON.stringify(bmjson));
    localStorage.setItem('tagsjson', JSON.stringify(tagsjson));
    localStorage.setItem('categoriesjson', JSON.stringify(categoriesjson));
    Select(0);
}




function handleAuthClick(event) { //Sign in the user upon button click.
    gapi.auth2.getAuthInstance().signIn();
}

function handleSignoutClick(event) { //Sign out the user upon button click.
    gapi.auth2.getAuthInstance().signOut();
}

function getMetaData(name, done) {
    var FOLDER_ID = 'root';
    var query = "trashed=false and '" + FOLDER_ID + "' in parents and fullText contains '" + name + "'";
    gapi.client.drive.files.list({
        'q': query,
        'pageSize': 10,
        'fields': "nextPageToken, files(id, name, modifiedTime)"
    }).then(function (response) {
        var files = response.result.files;
        if (files.length > 0) {
            done(files[0]);
        } else {
            done();
        }
    }, function (reason) {
        console.log('loadFileRaw ERROR: ', reason)
    });
}

function getFileContent(id, done) {
    // var FOLDER_ID = 'root';
    gapi.client.drive.files.get({
        fileId: id,
        alt: 'media'
    }).then(function (file) {
        var retFile = {
            name: file.name,
            id: file.id,
            content: file.body,
            parents: file.parents
        };
        done(retFile);
        // console.log(JSON.stringify(retFile));
    }, function (reason) {
        console.log('loadFileRaw ERROR: ', reason)
    });
}

function saveFile2GD(name, fileContent) {
    var FOLDER_ID = 'root';
    var query = "trashed=false and '" + FOLDER_ID + "' in parents and fullText contains '" + name + "'";
    gapi.client.drive.files.list({
        'q': query,
        'pageSize': 10,
        'fields': "nextPageToken, files(id, name, modifiedTime)"
    }).then(function (response) {
        var files = response.result.files;
        if (files && files.length > 0) { // file exists, so update
            console.log(`${files[0].id} ${files[0].modifiedTime}`);
            updateFile(files[0].id, fileContent);
        } else { //file does not exist, so new upload
            console.log(`${name}`);
            uploadFile(name, fileContent);
        }
    });
}

function uploadFile(name, fileContent) { //https://gist.github.com/tanaikech/bd53b366aedef70e35a35f449c51eced
    var file = new Blob([fileContent], {
        type: 'text/plain'
    });
    var metadata = {
        'name': name, // Filename at Google Drive
        'mimeType': 'text/plain', // mimeType at Google Drive
        'parents': ['root'], // Folder ID at Google Drive
    };
    var accessToken = gapi.auth.getToken().access_token; // Here gapi is used for retrieving the access token.
    var form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], {
        type: 'application/json'
    }));
    form.append('file', file);
    fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
        method: 'POST',
        headers: new Headers({
            'Authorization': 'Bearer ' + accessToken
        }),
        body: form,
    }).then((res) => {
        return res.json();
    }).then(function (val) {
        console.log(val);
    });
}

function updateFile(id, fileContent) { //https://gist.github.com/tanaikech/bd53b366aedef70e35a35f449c51eced
    var file = new Blob([fileContent], {
        type: 'text/plain'
    });
    var accessToken = gapi.auth.getToken().access_token; // Here gapi is used for retrieving the access token.
    fetch(`https://www.googleapis.com/upload/drive/v3/files/${id}`, {
        method: 'PATCH',
        headers: new Headers({
            'Authorization': 'Bearer ' + accessToken
        }),
        body: file,
    }).then((res) => {
        return res.json();
    }).then(function (val) {
        console.log(val);
    });
}

// $(document).ready(function(){
//     gapi.auth2.getAuthInstance().signIn();
// });

function getFileContent2(name, done) {
    var FOLDER_ID = 'root';
    var query = "trashed=false and '" + FOLDER_ID + "' in parents and fullText contains '" + name + "'";
    gapi.client.drive.files.list({
        'q': query,
        'pageSize': 10,
        'fields': "nextPageToken, files(id, name, modifiedTime)"
    }).then(function (response) {
        var files = response.result.files;
        var id = files[0].id;
        gapi.client.drive.files.get({
            // fileId: file.id,
            fileId: id,
            alt: 'media'
        }).then(function (file) {
            var retFile = {
                name: file.name,
                id: file.id,
                content: file.body,
                parents: file.parents
            };
            done(retFile);
            // console.log(JSON.stringify(retFile));
        }, function (reason) {
            console.log('loadFileRaw ERROR: ', reason)
        });
    });
}
