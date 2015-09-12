var CYBOZU_CONFIG = {
    'user_id': 'xxxxxxxx',
    'password': 'XXXXXXXXXX',
    'domain': 'CYBOZU_DOMAIN',
    'url': 'http://CYBOZU_DOMAIN',
    'top_page_path': '/cgi-bin/cbag/ag.exe'
};
var SCHEDULE_TIMEOUT = 300;  // 5min
var CHECK_INTERVAL = SCHEDULE_TIMEOUT * 1000;   // 5min
var FLUSH_INTERVAL = 600 * 1000;    // 10min

function getStrDate() {
    var nowDate = new Date();
    var nowUnixTime = Date.parse(nowDate) / 1000;
    var year = nowDate.getYear();
    var year4 = (year < 2000) ? year + 1900 : year;
    var month = nowDate.getMonth() + 1;
    var date = nowDate.getDate();
    if (month < 10) {
        month = '0' + month;
    }

    if (date < 10) {
        date = '0' + date;
    }

    return (year4 + '/' + month + '/' + date);
}

function tabDestroy() {
    chrome.tabs.query({
        currentWindow: true
    }, function(tabs) {
        tabs.forEach(function(tab) {
            var urlRegExp = tab.url.match(/^(https?|file):\/{2,3}([0-9a-z\.\-:]+?):?[0-9]*?\//i);
            if (urlRegExp === null) {
                chrome.tabs.remove(tab.id);
            }
            if (urlRegExp[2] === CYBOZU_CONFIG['domain']) {
                chrome.tabs.update(tab.id, {
                    url: CYBOZU_CONFIG['url']
                });
            } else {
                chrome.tabs.remove(tab.id);
            }
        });

    });
}

function isInLocalStorage(keyName) {
    if (typeof(localStorage[keyName]) === 'undefined') {
        return false;
    }

    return true;
}

function getCybozuSchedule() {
    var strDate = getStrDate();
    if (isInLocalStorage('cybozuSchedule_' + strDate) === true) {
        return;
    }

    var xhr = new XMLHttpRequest();
    document.cookie = CYBOZU_CONFIG['user_id'];
    xhr.open('GET', CYBOZU_CONFIG['url'] + CYBOZU_CONFIG['top_page_path'], true);
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4 && xhr.status === 200) {
            localStorage['cybozuSchedule_' + strDate] = xhr.responseText;
        }
    };

    xhr.send({
        '_ID': CYBOZU_CONFIG['user_id'],
        'Password': CYBOZU_CONFIG['password'],
        '_System': 'login',
        '_Login': 1,
        'LoginMethod': 1
    });
}

function checkCybozuSchedule() {
    var strDate = getStrDate();
    if (isInLocalStorage('cybozuSchedule_' + strDate) !== true) {
        getCybozuSchedule();
        return;
    }

    // parse dom to html
    var domParser = new DOMParser();
    // response html dom
    var htmlDom = domParser.parseFromString(localStorage['cybozuSchedule_' + strDate], "text/html");

    // schedule td dom array
    var allScheduleArray = htmlDom.querySelectorAll('td.eventcell');

    // get today's schedule
    var todaySchedule = allScheduleArray[0];

    // get today's schedule event time
    var todayScheduleEventTime = todaySchedule.querySelectorAll('span.eventDateTime');

    // event start times
    var eventStartTimeArray = [];

    // get all start times
    for (var i = 0; i < todayScheduleEventTime.length; i++) {
        var eventSplitArray = todayScheduleEventTime[i].innerText.split('-');
        eventStartTimeArray.push(eventSplitArray[0]);
    }

    var nowDate = new Date();
    var nowUnixTime = Date.parse(nowDate) / 1000;

    // check start time difference
    for (var j = 0; j < eventStartTimeArray.length; j++) {
        var eventStartUnixTime = Date.parse(strDate + ' ' + eventStartTimeArray[j]) / 1000;
        var timeDifference =  eventStartUnixTime - nowUnixTime;
        if (timeDifference > 0 && timeDifference < SCHEDULE_TIMEOUT ) {
            return true;
        }
    }
    return false;
}

chrome.browserAction.onClicked.addListener(function() {

    window.setInterval(function() {
        if (checkCybozuSchedule() === true) {
            tabDestroy();
        }
    }, CHECK_INTERVAL);

    window.setInterval(function() {
        var strDate = getStrDate();
        localStorage.removeItem('cybozuSchedule_' + strDate);
    }, FLUSH_INTERVAL);
});