/**
    Copyright 2014-2015 Amazon.com, Inc. or its affiliates. All Rights Reserved.

    Licensed under the Apache License, Version 2.0 (the 'License'). You may not use this file except in compliance with the License. A copy of the License is located at

        http://aws.amazon.com/apache2.0/

    or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
*/

/**
 * This simple sample has no external dependencies or session management, and shows the most basic
 * example of how to create a Lambda function for handling Alexa Skill requests.
 *
 * Examples:
 * One-shot model:
 *  User: 'Alexa, ask Agile Central to create a defect named 'login page bug''
 *  Alexa: 'A defect named ‘login page bug' has been created'
 */

/**
 * App ID for the skill
 */
var APP_ID = undefined; //replace with 'amzn1.echo-sdk-ams.app.[your-unique-value-here]';

/**
 * The AlexaSkill prototype and helper functions
 */ 
var AlexaSkill = require('./AlexaSkill'); 
var rally = require('rally');
var restApi = rally({
        //user: 'userName', //required if no api key, defaults to process.env.RALLY_USERNAME
        //pass: 'password', //required if no api key, defaults to process.env.RALLY_PASSWORD
        apiKey: '', //preferred, required if no user/pass, defaults to process.env.RALLY_API_KEY
        server: 'https://rally1.rallydev.com',  //this is the default and may be omitted
        requestOptions: {
            headers: {
                'X-RallyIntegrationName': 'My cool node.js program',  //while optional, it is good practice to
                'X-RallyIntegrationVendor': 'Agile Central Alexa Skill', //provide this header information
                'X-RallyIntegrationVersion': '1.0'                    
            }
            //any additional request options (proxy options, timeouts, etc.)     
        }
    });
var refUtils = rally.util.ref;
var queryUtils = rally.util.query;

/**
 * AgileCentral is a child of AlexaSkill.
 * To read more about inheritance in JavaScript, see the link below.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Introduction_to_Object-Oriented_JavaScript#Inheritance
 */
var AgileCentral = function () {
    AlexaSkill.call(this, APP_ID);
};

function normalizeType(value) {
    switch (value) {
        case 'defect':
            return 'defect';
        case 'bug':
            return 'defect';
        case 'user story':
            return 'hierarchicalrequirement';
        case 'story':
            return 'hierarchicalrequirement';
    }
}

function normalizeScheduleState(value) {
    return value === 'in progress' ? 'In-Progress' : value.substr(0,1).toUpperCase() + value.substr(1);
}

function normalizeDate(dateString) {
    var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    var years = {
        '2020': 'two thousand twenty',
        '2019': 'two thousand nineteen',
        '2018': 'two thousand eighteen',
        '2017': 'two thousand seventeen',
        '2016': 'two thousand sixteen',
        '2015': 'two thousand fifteen',
        '2014': 'two thousand fourteen',
        '2013': 'two thousand thirteen',
        '2012': 'two thousand twelve',
        '2011': 'two thousand eleven',
        '2010': 'two thousand ten',
        '2009': 'two thousand nine',
        '2008': 'two thousand eight',
        '2007': 'two thousand seven',
        '2006': 'two thousand six',
        '2005': 'two thousand five',
        '2004': 'two thousand four',
        '2003': 'two thousand three',
        '2002': 'two thousand two'
    };
    var days = {
        '01': 'first',
        '02': 'second',
        '03': 'third',
        '04': 'fourth',
        '05': 'fifth',
        '06': 'sixth',
        '07': 'seventh',
        '08': 'eighth',
        '09': 'ninth',
        '10': 'tenth',
        '11': 'eleventh',
        '12': 'twelth',
        '13': 'thirteeth',
        '14': 'fourteenth',
        '15': 'fifteenth',
        '16': 'sixteenth',
        '17': 'seventeenth',
        '18': 'eighteenth',
        '19': 'ninteenth',
        '20': 'twentienth',
        '21': 'twenty first',
        '22': 'twenty second',
        '23': 'twenty third',
        '24': 'twenty fourth',
        '25': 'twenty fifth',
        '26': 'twenty sixth',
        '27': 'twenty seventh',
        '28': 'twenty eighth',
        '29': 'twenty ninth',
        '30': 'thirtieth',
        '31': 'thirty first',
    }
    var tempDate = dateString.slice(0, 10).split('-');
    return months[Number(tempDate[1])-1] + ' ' + days[tempDate[2]] + ', ' + years[tempDate[0]];
}

function stringifyNumber(number) {
    return number.toString().split('').join(' ');
}

function sayExitStatement(response) {
    response.tell('Thanks for using Agile Central. Goodbye!');
}

function getHelpStatement(task) {
    switch (task) {
        case 'create':
            return 'You can say \'create story named foo bar\' to make a foo bar story in your default project.';
        case 'find':
            return 'You can say \'find defect 1 2 3 4 5\' to get a brief overview about that artifact.';
        case 'block':
            return 'You can say \'block defect 1 2 3 4 5\' to block that artifact.';
        case 'unblock':
            return 'You can say \'unblock defect 1 2 3 4 5\' to unblock that artifact.';
        case 'ready':
            return 'You can say \'ready defect 1 2 3 4 5\' to mark that artifact ready.';
        case 'unready':
            return 'You can say \'unready defect 1 2 3 4 5\' to mark that artifact unready.';
        case 'move':
            return 'You can say \'move defect 1 2 3 4 5 to Completed\' to update that artifact\'s schedule state to completed.';
        case 'stop':
            return 'You can say \'stop\' to abort your mission and exit Agile Central.';
        case 'help':
            return 'You can say \'help\' to get more info about Agile Central commands.';
        default:
            return 'I have 9 tasks: create, find, block/unblock, ready/unready, move, help, and stop. Say help me with any of the task names to get more info.';
    }
}

function sayFailure(response, error, failureStatement) {
    console.log('Failure! ' + error);
    response.tell('There was a failure while ' + failureStatement);
}

function saySuccess(response, statement) {
    console.log('Success! ' + statement);
    response.tell(statement);
}

function askForMoreInput(response, statement) {
    console.log('Need More Input!');
    response.ask(statement, getHelpStatement());
}

function confirmArtifactToCreate(response, type, name) {
    console.log('Confirming...');
    response.ask('Confirming that you would like to create a ' + type + ' named ' + name + '? Shall I continue?', getHelpStatement());
}

function artifactIsAlreadyInThatState(artifactData) {
    var requestedFieldName = Object.keys(artifactData.updateObject)[0];
    var requestedFieldValue = artifactData.updateObject[requestedFieldName];
    var artifactFieldValue = artifactData.artifact[requestedFieldName];
    return artifactFieldValue === requestedFieldValue;
}

function createArtifact(response, type, name) {
    console.log('Creating ' + type + name +'...');
    var data = {Name: name};
    if (type === 'defect') {
        data.Environment = 'Test';
    }
    restApi.create({
        type: type,
        data: data,
        fetch: ['FormattedID']
    }, function(error, result) {
        if (error) {
            sayFailure(response, error, 'creating your ' + type + ' named ' + name + '.');
        } else {
            saySuccess(response, type + ' ' + stringifyNumber(result.Object.FormattedID) + ' has been created in your default project.');
        }
    });
}

function findArtifact(response, session, type, id, successCallback, updateObject) {
    console.log('Reading artifact ' + type + id + '...');
    restApi.query({
        type: type,
        start: 1,
        pageSize: 1,
        limit: 1,
        order: 'Rank',
        fetch: ['FormattedID', 'Name', 'CreationDate', 'Owner', 'ObjectID', 'Blocked', 'Ready', 'ScheduleState'],
        query: queryUtils.where('FormattedID', '=', id)
    }, function(error, result) {
        if (error) {
            sayFailure(response, error, 'finding ' + type + id + '.');
        } else {
            var artifact = result.Results[0];
            if (artifact) {
                var artifactData = {
                    type: type,
                    id: id,
                    artifact: artifact,
                    updateObject: updateObject
                };
                successCallback(response, session, artifactData);
            } else {
                saySuccess(response, type + id + ' was not found.');
            }
        }
    });
}

function findArtifactSuccess(response, session, artifactData) {
    var owner = (artifactData.artifact.Owner && artifactData.artifact.Owner._refObjectName) || 'no owner';
    saySuccess(response, artifactData.type + stringifyNumber(artifactData.artifact.FormattedID) + ' was found. It is named ' + artifactData.artifact.Name + 
            ' and owned by ' + owner +
            ' and was created on ' + normalizeDate(artifactData.artifact.CreationDate));
}

function updateArtifactSuccess(response, session, artifactData) {
    if (artifactIsAlreadyInThatState(artifactData)) {
        saySuccess(response, artifactData.type + artifactData.id + ' is already in that state.');
    } else {
        restApi.update({
            ref: '/' + artifactData.type + '/' + artifactData.artifact.ObjectID,
            data: artifactData.updateObject,
            fetch: ['FormattedID', 'Name']
        }, function(error, result) {
            var fieldName = Object.keys(artifactData.updateObject)[0];
            var fieldValue = artifactData.updateObject[fieldName].toString();
            if (error) {
                sayFailure(response, error, 'updating ' + fieldName + ' to ' + fieldValue + ' for ' + artifactData.type + ' ' + artifactData.id);
            } else {
                if (result) {
                    saySuccess(response, 'Updated ' + fieldName + ' to ' + fieldValue + ' for ' + artifactData.type + ' ' + artifactData.id);
                } else {
                    saySuccess(response, artifactData.type + artifactData.id + ' was not found so it could be updated.');
                }
            }
        });
    }
}

function updateBlockedSuccess(response, session, artifactData) {
    if (artifactIsAlreadyInThatState(artifactData)) {
        saySuccess(response, artifactData.type + artifactData.id + ' is already in that state.');
    } else {
        restApi.update({
            ref: '/' + artifactData.type + '/' + artifactData.artifact.ObjectID,
            data: artifactData.updateObject,
            fetch: ['FormattedID', 'Name']
        }, function(error, result) {
            var fieldName = Object.keys(artifactData.updateObject)[0];
            var fieldValue = artifactData.updateObject[fieldName].toString();
            console.log(fieldName, fieldValue, error);
            if (error) {
                sayFailure(response, error, 'updating ' + fieldName + ' to ' + fieldValue + ' for ' + artifactData.type + ' ' + artifactData.id);
            } else {
                if (result) {
                    session.attributes.artifactType = artifactData.type;
                    session.attributes.artifactId = artifactData.id;
                    askForMoreInput(response, 'Updated ' + fieldName + ' to ' + fieldValue + ' for ' + artifactData.type + ' ' + artifactData.id +
                        '. Now to add a blocked reason, say \'add blocked reason blah blah blah\' or \'no blocked reason\'.');
                } else {
                    saySuccess(response, artifactData.type + artifactData.id + ' was not found so it could be updated.');
                }
            }
        });
    }
}

// Extend AlexaSkill
AgileCentral.prototype = Object.create(AlexaSkill.prototype);
AgileCentral.prototype.constructor = AgileCentral;

AgileCentral.prototype.eventHandlers.onSessionStarted = function (sessionStartedRequest, session) {
    console.log('AgileCentral onSessionStarted requestId: ' + sessionStartedRequest.requestId + ', sessionId: ' + session.sessionId);
};

AgileCentral.prototype.eventHandlers.onLaunch = function (launchRequest, session, response) {
    console.log('AgileCentral onLaunch requestId: ' + launchRequest.requestId + ', sessionId: ' + session.sessionId);
    response.ask('Welcome to Agile Central. Say help for more info.', getHelpStatement());
};

AgileCentral.prototype.eventHandlers.onSessionEnded = function (sessionEndedRequest, session) {
    console.log('AgileCentral onSessionEnded requestId: ' + sessionEndedRequest.requestId + ', sessionId: ' + session.sessionId);
};  
   
AgileCentral.prototype.intentHandlers = {
    'ArtifactCreateIntent': function (intent, session, response) {
        var type = normalizeType(intent.slots.Type.value);
        var name = intent.slots.Name.value;

        if (type && name) {
            session.attributes.artifactType = type;
            session.attributes.artifactName = name;
            confirmArtifactToCreate(response, type, name);
        } else {
            askForMoreInput(response, 'I cannot create an artifact with your input. Try saying \'create story named new story\' to create a new artifact.');
        }
    },
    'AMAZON.YesIntent': function (intent, session, response) {
        if (session.attributes && session.attributes.artifactType && session.attributes.artifactName) {
            createArtifact(response, session.attributes.artifactType, session.attributes.artifactName);
        } else {
            askForMoreInput(response, 'Try saying \'create story named new story\' to create a new artifact.');
        }
    },
    'AMAZON.NoIntent': function (intent, session, response) {
        delete session.attributes.artifactType;
        delete session.attributes.artifactName;
        delete session.attributes.artifactId;
        askForMoreInput(response, 'Try saying \'create story named new story\' to create a new artifact.');
    },
    'ArtifactFindIntent': function (intent, session, response) {
        var type = normalizeType(intent.slots.Type.value);
        var id = intent.slots.Id.value;

        if (type && id) {
            findArtifact(response, session, type, id, findArtifactSuccess);
        } else {
            askForMoreInput(response, 'I cannot find an artifact with your input. Try saying \'find defect 1 2 3 4 5\' to find info for your artifact.');
        }
    },
    'ArtifactBlockIntent': function (intent, session, response) {
        var type = normalizeType(intent.slots.Type.value);
        var id = intent.slots.Id.value;

        if (type && id) {
            findArtifact(response, session, type, id, updateBlockedSuccess, {Blocked: true, Ready: false});
        } else {
            askForMoreInput(response, 'I cannot find an artifact with your input. Try saying \'block defect 1 2 3 4 5\' to block on your artifact.');
        }
    },
    'ArtifactBlockedReasonIntent': function (intent, session, response) {
        var reason = intent.slots.Reason.value;

        if (reason && session.attributes && session.attributes.artifactType && session.attributes.artifactId) {
            findArtifact(response, session, session.attributes.artifactType, session.attributes.artifactId, updateArtifactSuccess, {BlockedReason: reason});
        } else {
            saySuccess(response, 'Your artifact will have no blocked reason.');
        }
    },
    'ArtifactUnblockIntent': function (intent, session, response) {
        var type = normalizeType(intent.slots.Type.value);
        var id = intent.slots.Id.value;

        if (type && id) {
            findArtifact(response, session, type, id, updateArtifactSuccess, {Blocked: false});
        } else {
            askForMoreInput(response, 'I cannot find an artifact with your input. Try saying \'unblock defect 1 2 3 4 5\' to unblock on your artifact.');
        }
    },
    'ArtifactReadyIntent': function (intent, session, response) { 
        var type = normalizeType(intent.slots.Type.value);
        var id = intent.slots.Id.value;

        if (type && id) {
            findArtifact(response, session, type, id, updateArtifactSuccess, {Ready: true, Blocked: false});
        } else {
            askForMoreInput(response, 'I cannot find an artifact with your input. Try saying \'ready defect 1 2 3 4 5\' to ready on your artifact.');
        }
    },
    'ArtifactUnreadyIntent': function (intent, session, response) {
        var type = normalizeType(intent.slots.Type.value);
        var id = intent.slots.Id.value;

        if (type && id) {
            findArtifact(response, session, type, id, updateArtifactSuccess, {Ready: false});
        } else {
            askForMoreInput(response, 'I cannot find an artifact with your input. Try saying \'unready defect 1 2 3 4 5\' to unready on your artifact.');
        }
    },
    'ArtifactMoveIntent': function (intent, session, response) { 
        var type = normalizeType(intent.slots.Type.value);
        var id = intent.slots.Id.value;
        var state = normalizeScheduleState(intent.slots.State.value);

        if (type && id && state) {
            findArtifact(response, session, type, id, updateArtifactSuccess, {ScheduleState: state});
        } else {
            askForMoreInput(response, 'I cannot find an artifact with your input. Try saying \'move defect 1 2 3 4 5\' to completed to move your artifact.');
        }
    },
    'AMAZON.CancelIntent': function (intent, session, response) {
        sayExitStatement(response);
    },
    'AMAZON.StopIntent': function (intent, session, response) {
        sayExitStatement(response);
    },
    'AMAZON.HelpIntent': function (intent, session, response) {
        response.ask('Let me help, ' + getHelpStatement(), getHelpStatement());
    },
    'ArtifactHelpIntent': function (intent, session, response) {
        var task = intent.slots.Task.value;

        if (task) {
            response.ask(getHelpStatement(task), getHelpStatement());
        } else {
            response.ask('Let me help, ' + getHelpStatement(), getHelpStatement());
        }
    },
    'EasterEggContractTestIntent': function (intent, session, response) {
        response.tell('Zero tests have been written.');
    },
    'EasterEggPasswordIntent': function (intent, session, response) {
        response.tell('OK, I will email your new password to your manager.');
    },
    'EasterEggArtifactTimeIntent': function (intent, session, response) {
        response.tell('Don\t worry, you will no longer be with us.');
    },
    'EasterEggFreeFoodIntent': function (intent, session, response) {
        response.tell('Why are you asking me? I would ask Wade.');
    }
};

// Create the handler that responds to the Alexa Request.
exports.handler = function (event, context) {
    // Create an instance of the AgileCentral skill.
    var agileCentral = new AgileCentral();
    agileCentral.execute(event, context);
};
