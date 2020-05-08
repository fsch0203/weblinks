function getshaarlidb() { //get records from shaarli server
    $('#syncing').show();
    console.log(`getshaarli started`);
    let url = _settings.shaarliurl + 'api/v1/' + 'links?limit=' + _settings.bmlimit; //TODO: optional # of records
    fetch(url, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + generateToken(_settings.shaarlisecret)
            }
        })
        .then(response => response.json())
        .then((json) => {
            // alert(`${JSON.stringify(json)}`);
            shaarli2bmdb(json);
            // Select(0);
            _settings.lastsync = new Date().toISOString();
            localStorage.setItem('settings', JSON.stringify(_settings));
            console.log(`Get shaarli successful. Last sync: ${_settings.lastsync}`);
            alertmessage(`Shaarli-synchronization successful. Last sync: ${_settings.lastsync}`);
            // alertmessage('Data from Shaarli-server')
            $('#syncing').hide();
        })
        .catch(error => {
            // getstartdata(); //use old data or get startdata
            console.error(`Error: ${error} `);
            // alert(`Fetch error: ${error}`);
            $('#syncing').hide();
        });
}

function updateshaarlidb() { //send new and updated records to shaarli server
    $('#syncing').show();
    let ls = date2iso8601(new Date(_settings.lastsync));
    var bmjson = JSON.parse(localStorage.getItem('bmjson'));
    var updatedbms = $.grep(bmjson, (function (record, i) {
        return record.updated > ls;
    })); //updated records: change since last sync
    console.log(`updated : ${JSON.stringify(updatedbms)}`);
    const updatedcount = updatedbms.length;
    updatedbms.reduce((seq, updatedbm) => { //https://riptutorial.com/javascript/example/5917/reduce-an-array-to-chained-promises
        console.log(`${JSON.stringify(updatedbm)}`);
        return seq.then(() => {
            if (updatedbm.id < 10000) { //existing record
                _settings.lastsync = new Date().toISOString();
                localStorage.setItem('settings', JSON.stringify(_settings));
                let weblink = bm2shaarli(updatedbm); //make shaarli format
                console.log('update: ' + ' ' + JSON.stringify(weblink));
                let url = _settings.shaarliurl + 'api/v1/links/' + weblink.id;
                return fetch(url, {
                        method: 'PUT',
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": "Bearer " + generateToken(_settings.shaarlisecret)
                        },
                        body: JSON.stringify(weblink)
                    })
                    .then(response => response.json())
                    .then((json) => {
                        console.log('Success: ' + ' ' + JSON.stringify(json));
                        updatesuccess = true;
                    })
                    .catch((error) => {
                        let updated = date2iso8601(new Date());
                        objIndex = bmjson.findIndex((obj => obj.id == updatedbm.id)); // finds index of existing record
                        bmjson[objIndex].updated = updated; // update with recent change
                        localStorage.setItem('bmjson', JSON.stringify(bmjson)); // save to LS
                        console.error('Error:', error);
                        updatesuccess = false;
                        $('#syncing').hide();
                    });
            } else { //new record (has long random id)
                let weblink = new2shaarli(updatedbm); //make shaarli format
                console.log('new: ' + ' ' + JSON.stringify(weblink));
                let url = _settings.shaarliurl + 'api/v1/links';
                return fetch(url, {
                        method: 'POST',
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": "Bearer " + generateToken(_settings.shaarlisecret)
                        },
                        body: JSON.stringify(weblink)
                    })
                    .then(response => response.json())
                    .then((json) => {
                        console.log('Success: ' + ' ' + JSON.stringify(json));
                        objIndex = bmjson.findIndex((obj => obj.id == updatedbm.id)); // finds index of existing record
                        bmjson[objIndex].id = json.id; // update with recent change
                        localStorage.setItem('bmjson', JSON.stringify(bmjson)); // save to LS
                        updatesuccess = true;
                    })
                    .catch((error) => {
                        console.error('Error:', error);
                        updatesuccess = false;
                        $('#syncing').hide();
                    });
            }
        });
    }, Promise.resolve()).then(() => {
            console.log(`${updatedcount} records updated to shaarli-server`);
            alertmessage(`${updatedcount} records updated to Shaarli-server`);
            getshaarlidb();
        },
        (e) => {
            console.log(e)
            $('#syncing').hide()
        });
}

function removefromshaarli(which) { //which is array like ['open','_trash']
    var bmjson = JSON.parse(localStorage.getItem('bmjson'));
    var removebms = $.grep(bmjson, (function (record, i) {
        return record.category == '_trash';
    }));
    const removecount = removebms.length;
    console.log(`remove #: ${removecount}`);
    console.log(`remove #: ${JSON.stringify(removebms)}`);
    removebms.reduce((seq, removebm) => { //https://riptutorial.com/javascript/example/5917/reduce-an-array-to-chained-promises
        console.log(`${JSON.stringify(removebm)}`);
        return seq.then(() => {
            let weblink = bm2shaarli(removebm); //make shaarli format
            console.log('remove weblink: ' + JSON.stringify(weblink));
            let url = _settings.shaarliurl + 'api/v1/links/' + weblink.id;
            return fetch(url, {
                    method: 'DELETE',
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": "Bearer " + generateToken(_settings.shaarlisecret)
                    }
                })
                .then((json) => {
                    console.log('Succes. Record ' + weblink.id + ' removed ' + json.status); //should be 204
                    objIndex = bmjson.findIndex((obj => obj.id == weblink.id)); // finds index of existing record
                    bmjson.splice(objIndex, 1);
                    localStorage.setItem('bmjson', JSON.stringify(bmjson)); // save to LS
                })
                .catch((error) => {
                    console.error('Error:', error);
                });
        });
    }, Promise.resolve()).then(() => {
            console.log(`${removecount} records removed from shaarli-server`);
            alertmessage(`${removecount} records removed from shaarli-server`);
            getshaarlidb();
        },
        (e) => console.log(e)
    );
}

function bm2shaarli(bm) { //takes object in app-format, convert to shaarli-format
    let tags = bm.tags.split(' ');
    if (bm.category) tags.push('@' + bm.category);
    if (bm.rating) tags.push('_star_' + bm.rating);
    let private = (bm.private.toLocaleLowerCase() === 'private');
    let weblink = {
        id: bm.id,
        url: bm.url,
        shorturl: bm.shorturl,
        title: bm.title,
        description: bm.description,
        tags: tags,
        private: private,
        created: bm.created, //in iso8601 format
        updated: bm.updated //in iso8601 format
    }
    return weblink;
}

function new2shaarli(bm) { //takes object in app-format, convert to shaarli-format to make new weblink
    let tags = bm.tags.split(' ');
    if (bm.category) tags.push('@' + bm.category);
    if (bm.rating) tags.push('_star_' + bm.rating);
    let private = (bm.private.toLocaleLowerCase() === 'private');
    let weblink = {
        url: bm.url,
        title: bm.title,
        description: bm.description,
        tags: tags,
        private: private
    }
    return weblink;
}

function shaarli2bmdb(weblinks) { //takes object in shaarli-format, to make bmdb, tagsdb and categoriesdb
    var bmjson = [];
    var tagsjson = [];
    var categoriesjson = [];
    weblinks.forEach(function (weblink, idx) {
        let category = '';
        let tags = weblink.tags; //array with tags
        let i = tags.findIndex(element => (element.indexOf("@") === 0)); //every category is tag that starts with @
        if (i > -1) {
            category = tags[i].substr(1).trim();
            tags.splice(i, 1); //take out category-tag
            objIndex = categoriesjson.findIndex((obj => obj.label == category));
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
        }
        let rating = 0;
        let j = tags.findIndex(element => element.includes("_star_")); //every rating is tag that starts with _star_
        if (j > -1) {
            rating = parseInt(tags[j].substr(6, 1));
            tags.splice(j, 1); //take out rating-tag
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
        let private = (weblink.private) ? 'Private' : 'Public';
        let updated = (weblink.updated) ? weblink.updated : weblink.created;
        let bm = {
            id: weblink.id,
            url: weblink.url,
            shorturl: weblink.shorturl,
            title: weblink.title,
            description: weblink.description,
            tags: tags.join(' '),
            private: private,
            created: weblink.created,
            updated: updated,
            category: category,
            rating: rating
        }
        bmjson.push(bm);
    });
    localStorage.setItem('bmjson', JSON.stringify(bmjson));
    localStorage.setItem('tagsjson', JSON.stringify(tagsjson));
    localStorage.setItem('categoriesjson', JSON.stringify(categoriesjson));
    Select(0);
}

function generateToken(secret) {
    var jwt = {
        "typ": "JWT",
        "alg": "HS512"
    }
    let header = btoa(JSON.stringify(jwt));
    let timeStamp = Date.now() / 1000 | 0;
    let time = {
        "iat": timeStamp
    }
    let payload = btoa(JSON.stringify(time));
    let text = header + '.' + payload;
    let signature = calcHMAC(text, secret);
    //Don't ask why: replace + by - and / by _ and delete =
    signature = signature.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
    let token = header + '.' + payload + '.' + signature;
    return token;
}

function calcHMAC(hmacText, secret) {
    var hmacTextType = 'TEXT';
    var hmacKeyInput = secret;
    var hmacKeyInputType = 'TEXT';
    var hmacVariant = 'SHA-512';
    var hmacOutputType = 'B64';
    var hmacOutput;
    var hmacObj = new jsSHA(
        hmacVariant,
        hmacTextType
    );
    hmacObj.setHMACKey(
        hmacKeyInput,
        hmacKeyInputType
    );
    hmacObj.update(hmacText);
    hmacOutput = hmacObj.getHMAC(hmacOutputType);
    return hmacOutput;
}
