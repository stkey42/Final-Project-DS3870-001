const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const crypto = require('crypto');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const pool = mysql.createPool({
    host:'localhost',
    user:'root',
    password:'Mickey2023!',
    database:'finalproject'
});
const HTTP_PORT = 8000;

// Create Custom Classes
class Session {
    constructor(strSessionID,objUser,datStartDateTime,datLastUsedDateTime) {
        this.SessionID = strSessionID;
        this.User = objUser;
        this.StartDateTime = datStartDateTime;
        this.LastUsedDateTime = datLastUsedDateTime;
    }
}

class User {
    constructor(strEmail,strFirstName,strLastName,strMobileNumber,objFarm,blnOwner){
        this.Email = strEmail;
        this.FirstName = strFirstName;
        this.LastName = strLastName;
        this.MobileNumber = strMobileNumber;
        this.Farm = objFarm;
        this.FarmOwner = blnOwner;
    }
}

class Farm {
    constructor(strFarmID,strFarmName,strStreetAddress1,strStreetAddress2,strCity,strState,strZIP) {
        this.FarmID = strFarmID;
        this.FarmName = strFarmName;
        this.StreetAddress1 = strStreetAddress1;
        this.StreetAddress2 = strStreetAddress2;
        this.City = strCity;
        this.State = strState;
        this.ZIPCode = strZIP;
    }
}

class Product {
    constructor(strProductID,strShortName,strLongName,strDescription,strStatus,objFarm){
        this.ProductID = strProductID;
        this.ShortName = strShortName;
        this.LongName = strLongName;
        this.Description = strDescription;
        this.Status = strStatus;
        this.Farm = objFarm;
    }
}

class Message {
    constructor(strType,strMessage){
        this.Type = strType;
        this.Message = strMessage;
    }
}
// End Step One

//Step Two
var app = express();
app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.text());
// End Step Two

// Step Three
function uuidv4() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}
app.listen(HTTP_PORT, () => {
    console.log("Server is listening on port " + HTTP_PORT);
});
//End Step Three

// Step Four Users
//create a new user without them being assigned to a farm
app.post("/users", (req,res,next) => {
    let strFirstName = req.query.firstname || req.body.firstname;
    let strLastName = req.query.lastname || req.body.lastname;
    let strPreferredName = req.query.preferredname || req.body.preferredname;
    let strEmail = req.query.email || req.body.email;
    let strPassword = req.query.password || req.body.password;
    // call the hash method of bcrypt against the password to encrypt and store with a salt
    // notice the use of .then as a promise due to it being async
    bcrypt.hash(strPassword, 10).then(hash => {
        strPassword = hash;
        pool.query('INSERT INTO tblUsers VALUES(?, ?, ?, ?, ?,SYSDATE())',[strEmail, strFirstName, strLastName, strPreferredName, strPassword], function(error, results){
            if(!error){
                let objMessage = new Message("Success","New User Created");
                res.status(201).send(objMessage);
            } else {
                let objMessage = new Message("Error",error);
                res.status(400).send(objMessage);
            }
        })
    })
})

// updates user
app.put("/users", (req,res,next) => {
    let strSessionID = req.queryl.sessionid || req.body.sesisonid;
    let strFirstName = req.query.firstname || req.body.firstname;
    let strLastName = req.query.lastname || req.body.lastname;
    let strMobileNumber = req.query.mobilenumber || req.body.mobilenumber;
    // call the hash method of bcrypt against the password to encrypt and store with a salt
    // notice the use of .then as a promise due to it being async
    getSessionDetails(strSessionID,function(objSession){
        if(objSession){
            pool.query('UPDATE tblUsers SET FirstName = ?, LastName = ?, MobileNumber = ? WHERE Email = ?)',[strFirstName, strLastName, strMobileNumber, objSession.User.Email], function(error, results){
                if(!error){
                    let objMessage = new Message("Success","User Updated");
                    res.status(201).send(objMessage);
                } else {
                    let objMessage = new Message("Error",error);
                    res.status(400).send(objMessage);
                }
            })
        } else {
            let objError = new Message("Error","Bad Session");
            res.status(401).send(objError);
        }
    })
})

app.put("/userpassword", (req,res,next) => {
    let strSessionID = req.queryl.sessionid || req.body.sesisonid;

    let strPassword = req.query.password || req.body.password;
    // call the hash method of bcrypt against the password to encrypt and store with a salt
    // notice the use of .then as a promise due to it being async
    bcrypt.hash(strPassword, 10).then(hash => {
        strPassword = hash;
        getSessionDetails(strSessionID,function(objSession){
            if(objSession){
                pool.query('UPDATE tblUsers SET Password = ? WHERE Email = ?)',[strPassword, objSession.User.Email], function(error, results){
                    if(!error){
                        let objMessage = new Message("Success","User Password Updated");
                        res.status(201).send(objMessage);
                    } else {
                        let objMessage = new Message("Error",error);
                        res.status(400).send(objMessage);
                    }
                })
            } else {
                let objError = new Message("Error","Bad Session");
                res.status(401).send(objError);
            }
        })
    })
})

//note there is not a user delete function.  In the EU we would have to provide one, but 
//here GDPR does not matter as much

//assigns a user to a farm when the logged in user associated with the sessionid passed
//is the owner of the farm
app.post("/farmassignment",(req,res,next)=> {
    let strSessionID = req.query.sessionid || req.body.sessionid;
    let strAssignmentID = uuidv4();
    let strUser = req.query.user || req.body.user;
    getSessionDetails(strSessionID,function(objSession){
        if(objSession){
            if(objSession.User.FarmOwner == true){
                pool.query("INSERT INTO tblFarmAssignment VALUES(?,?,false,?)",[strAssignmentID,objSession.User.Farm.FarmID,strUser], function(error, results){
                    if(!error){
                        let objMessage = new Message("AssignmentID",strAssignmentID);
                        res.status(201).send(objMessage);
                    } else {
                        let objMessage = new Message("Error",error);
                        res.status(400).send(objMessage);
                    }
                })
            } else {
                let objError = new Message("Error","Function limited to farm owner");
            res.status(401).send(objError);
            }
            
        } else {
            let objError = new Message("Error","Bad Session");
            res.status(401).send(objError);
        }
        
    })
    
})

// remove farm assignment;  note there is not an update as that would make no sense in this context
app.delete("/farmassignment",(req,res,next)=> {
    let strSessionID = req.query.sessionid || req.body.sessionid;
    let strAssignmentID = req.query.sessionid || req.body.sessionid;
    getSessionDetails(strSessionID,function(objSession){
        if(objSession){
            if(objSession.User.FarmOwner == true){
                pool.query("DELETE FROM tblFarmAssignment WHERE AssignmentID = ? AND FarmID = ?",[strAssignmentID,objSession.User.Farm.FarmID], function(error, results){
                    if(!error){
                        let objMessage = new Message("Success","Assignment Deleted");
                        res.status(201).send(objMessage);
                    } else {
                        let objMessage = new Message("Error",error);
                        res.status(400).send(objMessage);
                    }
                })
            } else {
                let objError = new Message("Error","Function limited to farm owner");
            res.status(401).send(objError);
            }
            
        } else {
            let objError = new Message("Error","Bad Session");
            res.status(401).send(objError);
        }
        
    })
    
})

//create a new farm which also requires creating a new user and assigning them to the new farm
//please note we generate a new session at the same time to make sure the user does not have to
//enter username and password twice
app.post("/farms", (req,res,next) => {
    let strStreetAddress1 = req.query.streetaddress1 || req.body.streetaddress1;
    let strStreetAddress2 = req.query.streetaddress2 || req.body.streetaddress2;
    let strCity = req.query.city || req.body.city;
    let strState = req.query.state || req.body.state;
    let strZIP = req.query.zip || req.body.zip;
    let strFarmID = uuidv4();
    let strFarmName = req.query.farmname || req.body.farmname;
    let strFirstName = req.query.firstname || req.body.firstname;
    let strLastName = req.query.lastname || req.body.lastname;
    let strPreferredName = req.query.preferredname || req.body.preferredname;
    let strEmail = req.query.email || req.body.email;
    let strPassword = req.query.password || req.body.password;
    let strSession = uuidv4();
    let strAssignmentID = uuidv4();

    pool.query('INSERT INTO tblFarms VALUES(?, ?, ?, ?, ?,?,?)',[strFarmID, strFarmName, strStreetAddress1, strStreetAddress2, strCity,strState,strZIP], function(error, results){
        if(!error){
            bcrypt.hash(strPassword, 10).then(hash => {
                strPassword = hash;
                pool.query('INSERT INTO tblUsers VALUES(?, ?, ?, ?, ?,SYSDATE())',[strEmail, strFirstName, strLastName, strPreferredName, strPassword], function(error, results){
                    if(!error){
                        pool.query('INSERT INTO tblFarmAssignment VALUES(?, ?, true, ?)',[strAssignmentID, strFarmID, strEmail], function(error, results){
                            if(!error){
                                pool.query('INSERT INTO tblSesisons VALUES(?,SYSDATE(),?)',[strSession, strEmail], function(error, results){
                                    if(!error){
                                        let objMessage = new Message("SessionID",strSession);
                                        res.status(201).send(objMessage);
                                    } else {
                                        let objMessage = new Message("Error",error);
                                        res.status(400).send(objMessage);
                                    }
                                })
                            } else {
                                let objMessage = new Message("Error",error);
                                res.status(400).send(objMessage);
                            }
                        })
                    } else {
                        let objMessage = new Message("Error",error);
                        res.status(400).send(objMessage);
                    }
                })
            })
        } else {
            let objMessage = new Message("Error",error);
            res.status(400).send(objMessage);
        }
    })
})

// updates farm info
app.put("/farms", (req,res,next) => {
    let strSessionID = req.queryl.sessionid || req.body.sesisonid;
    let strStreetAddress1 = req.query.streetaddress1 || req.body.streetaddress1;
    let strStreetAddress2 = req.query.streetaddress2 || req.body.streetaddress2;
    let strCity = req.query.city || req.body.city;
    let strState = req.query.state || req.body.state;
    let strZIP = req.query.zip || req.body.zip;
    let strFarmName = req.query.farmname || req.body.farmname;
    
    getSessionDetails(strSessionID,function(objSession){
        if(objSession){
            pool.query('UPDATE tblFarms SET FarmName =?, StreetAddress1 = ?, StreetAddress2 = ?, City = ?, State =?, ZIP = ? WHERE FarmID = ?',[strFarmName, strStreetAddress1, strStreetAddress2, strCity,strState,strZIP, objSession.User.Farm.FarmID], function(error, results){
                if(!error){
                    let objMessage = new Message("Success","Farm Updated");
                    res.status(201).send(objMessage);
                } else {
                    let objMessage = new Message("Error",error);
                    res.status(400).send(objMessage);
                }
            })
        } else {
            let objError = new Message("Error","Bad Session");
            res.status(401).send(objError);
        }
    })
})

// used during login process
app.post("/sessions",(req,res,next) => {
    let strEmail = req.query.email || req.body.email;
    let strPassword = req.query.password || req.body.password;
    
    pool.query('SELECT Password FROM tblUsers WHERE Email = ?', strEmail, function(error, results){
        if(!error){
            bcrypt.compare(strPassword, results[0].Password)
            .then(outcome => {
                if(outcome == true){
                    let strSessionID = uuidv4();
                    pool.query('INSERT INTO tblSessions VALUES(?, ?,SYSDATE())',[strSessionID, strEmail], function(error, results){
                        if(!error){
                            res.status(201).send({SessionID:strSessionID});
                        } else {
                            res.status(400).send({Error:error});
                        }
                    })
                } else {
                    res.status(401).send({Error:'Bad Username or Password'});
                }
            })
        } else {
            res.status(400).send(JSON.stringify({Error:error}));
        }
    })

})

// Delete a Session
app.delete("/sessions",(req,res,next) => {
    let strSessionID = req.queryl.sessionid || req.body.sesisonid;
    
    pool.query('DELETE FROM tblSessions WHERE SessionID = ?', strSessionID, function(error, results){
        if(!error){
            res.status(201).send({"Success":"Session Deleted"});
        } else {
            res.status(400).send(JSON.stringify({Error:error}));
        }
    })

})

//create a new product for the current users farm
app.post("/product",(req,res,next)=> {
    let strSessionID = req.query.sessionid || req.body.sessionid;
    let strProductID = uuidv4();
    let strShortName = req.query.shortname || req.body.shortname;
    let strLongName = req.query.longname || req.body.longname;
    let strDescription = req.query.description || req.body.description;
    getSessionDetails(strSessionID,function(objSession){
        if(objSession){
            pool.query("INSERT INTO tblProducts VALUES(?, ?, ?, ?, 'ACTIVE',?)",[strProductID,strShortName,strLongName,strDescription,objSession.User.Farm.FarmID], function(error, results){
                if(!error){
                    let objMessage = new Message("ProductID",strProductID);
                    res.status(201).send(objMessage);
                } else {
                    let objMessage = new Message("Error",error);
                    res.status(400).send(objMessage);
                }
            })
        } else {
            let objError = new Message("Error","Bad Session");
            res.status(401).send(objError);
        }
        
    })
    
})

app.put("/product",(req,res,next)=> {
    let strSessionID = req.query.sessionid || req.body.sessionid;
    let strProductID = req.query.productid || req.body.productid;
    let strShortName = req.query.shortname || req.body.shortname;
    let strLongName = req.query.longname || req.body.longname;
    let strDescription = req.query.description || req.body.description;
    let strStatus = req.query.status || req.body.status;
    
    getSessionDetails(strSessionID,function(objSession){
        if(objSession){
            pool.query("UPDATE tblProducts Set ShortName = ?, LongName = ?, Description = ?, Status = ? WHERE ProductID = ? AND FarmID = ?",[strShortName,strLongName,strDescription,strStatus, strProductID, objSession.User.Farm.FarmID], function(error, results){
                if(!error){
                    let objMessage = new Message("Success","Product Updated");
                    res.status(201).send(objMessage);
                } else {
                    let objMessage = new Message("Error",error);
                    res.status(400).send(objMessage);
                }
            })
        } else {
            let objError = new Message("Error","Bad Session");
            res.status(401).send(objError);
        }
        
    })
    
})

//create a new position for the current users farm, this should be limited to only the owner
// positions should not be updated but can be deleted
app.post("/position",(req,res,next)=> {
    let strSessionID = req.query.sessionid || req.body.sessionid;
    let strEntryID = uuidv4();
    let strPayRate = req.query.payrate || req.body.payrate;
    let strTitle = req.query.title || req.body.title;
    let strUser = req.query.user || req.body.user;
    getSessionDetails(strSessionID,function(objSession){
        if(objSession){
            if(objSession.User.FarmOwner == true){
                pool.query("INSERT INTO tblPosition VALUES(SYSDATE(), ?, ?, ?, ?,?)",[strEntryID,objSession.User.Farm.FarmID,strPayRate,strTitle,strUser], function(error, results){
                    if(!error){
                        let objMessage = new Message("PositionID",strEntryID);
                        res.status(201).send(objMessage);
                    } else {
                        let objMessage = new Message("Error",error);
                        res.status(400).send(objMessage);
                    }
                })
            } else {
                let objError = new Message("Error","Function limited to farm owner");
            res.status(401).send(objError);
            }
            
        } else {
            let objError = new Message("Error","Bad Session");
            res.status(401).send(objError);
        }
        
    })
    
})

app.delete("/position",(req,res,next)=> {
    let strSessionID = req.query.sessionid || req.body.sessionid;
    let strEntryID = req.query.entryid || req.body.entryid;
    
    getSessionDetails(strSessionID,function(objSession){
        if(objSession){
            if(objSession.User.FarmOwner == true){
                pool.query("DELETE FROM tblPosition WHERE EntryID = ? AND FarmID = ?",[strEntryID,objSession.User.Farm.FarmID], function(error, results){
                    if(!error){
                        let objMessage = new Message("Success","Position Deleted");
                        res.status(201).send(objMessage);
                    } else {
                        let objMessage = new Message("Error",error);
                        res.status(400).send(objMessage);
                    }
                })
            } else {
                let objError = new Message("Error","Function limited to farm owner");
            res.status(401).send(objError);
            }
            
        } else {
            let objError = new Message("Error","Bad Session");
            res.status(401).send(objError);
        }
        
    })
    
})

//create a new raw material
app.post("/rawmaterial",(req,res,next)=> {
    let strSessionID = req.query.sessionid || req.body.sessionid;
    let strMaterialID = uuidv4();
    let strRelatedProduct = req.query.shortname || req.body.shortname;
    let strQuantity = req.query.longname || req.body.longname;
    let strUnitOfMeasure = req.query.description || req.body.description;
    let strCost = req.query.description || req.body.description;
    getSessionDetails(strSessionID,function(objSession){
        if(objSession){
            pool.query("INSERT INTO tblRawMaterials VALUES(?, ?, ?, ?,SYSDATE(),?,?,?,?)",[strMaterialID,strDescription,strRelatedProduct,objSession.Email,strQuantity,strUnitOfMeasure,strCost,objSession.User.Farm.FarmID], function(error, results){
                if(!error){
                    let objMessage = new Message("MaterialID",strMaterialID);
                    res.status(201).send(objMessage);
                } else {
                    let objMessage = new Message("Error",error);
                    res.status(400).send(objMessage);
                }
            })
        } else {
            let objError = new Message("Error","Bad Session");
            res.status(401).send(objError);
        }
        
    })
})

app.put("/rawmaterial",(req,res,next)=> {
    let strSessionID = req.query.sessionid || req.body.sessionid;
    let strMaterialID = req.query.materialid || req.body.materialid;
    let strRelatedProduct = req.query.shortname || req.body.shortname;
    let strQuantity = req.query.longname || req.body.longname;
    let strUnitOfMeasure = req.query.description || req.body.description;
    let strCost = req.query.description || req.body.description;
    getSessionDetails(strSessionID,function(objSession){
        if(objSession){
            pool.query("UPDATE tblRawMaterials SET Description = ?, RelatedProduct = ?, Quantity = ?, UnitOfMeasure = ?, Cost = ? WHERE FarmID = ? AND MaterialID = ?",[strDescription,strRelatedProduct,strQuantity,strUnitOfMeasure,strCost,objSession.User.Farm.FarmID,strMaterialID], function(error, results){
                if(!error){
                    let objMessage = new Message("Success","Material Updated");
                    res.status(201).send(objMessage);
                } else {
                    let objMessage = new Message("Error",error);
                    res.status(400).send(objMessage);
                }
            })
        } else {
            let objError = new Message("Error","Bad Session");
            res.status(401).send(objError);
        }
        
    })
})

//create a new task log
app.post("/tasklog",(req,res,next)=> {
    let strSessionID = req.query.sessionid || req.body.sessionid;
    let strTaskLogID = uuidv4();
    let strTask = req.query.task || req.body.task;
    
    getSessionDetails(strSessionID,function(objSession){
        if(objSession){
            pool.query("INSERT INTO tblTaskLog VALUES(?,?,?,SYSDATE(),NULL,?)",[strTaskLogID,strTask,objSession.Email,objSession.User.Farm.FarmID], function(error, results){
                if(!error){
                    let objMessage = new Message("TaskLogID",strTaskLogID);
                    res.status(201).send(objMessage);
                } else {
                    let objMessage = new Message("Error",error);
                    res.status(400).send(objMessage);
                }
            })
        } else {
            let objError = new Message("Error","Bad Session");
            res.status(401).send(objError);
        }
        
    })
})

app.put("/tasklog",(req,res,next)=> {
    let strSessionID = req.query.sessionid || req.body.sessionid;
    let strTaskLogID = req.query.tasklogid || req.body.tasklogid;
    
    getSessionDetails(strSessionID,function(objSession){
        if(objSession){
            pool.query("UPDATE tblTaskLog SET Minutes = TIMESTAMPDIFF(MINUTE,LogDateTime,NOW()) WHERE TaskLogID = ? AND FarmID = ?",[strTaskLogID,objSession.User.Farm.FarmID], function(error, results){
                if(!error){
                    let objMessage = new Message("Success","Log Time Updated");
                    res.status(201).send(objMessage);
                } else {
                    let objMessage = new Message("Error",error);
                    res.status(400).send(objMessage);
                }
            })
        } else {
            let objError = new Message("Error","Bad Session");
            res.status(401).send(objError);
        }
        
    })
})

app.delete("/tasklog",(req,res,next)=> {
    let strSessionID = req.query.sessionid || req.body.sessionid;
    let strTaskLogID = req.query.tasklogid || req.body.tasklogid;
    
    getSessionDetails(strSessionID,function(objSession){
        if(objSession){
            pool.query("DELETE FROM tblTaskLog WHERE TaskLogID = ? AND FarmID = ?",[strTaskLogID,objSession.User.Farm.FarmID], function(error, results){
                if(!error){
                    let objMessage = new Message("Success","Log Deleted");
                    res.status(201).send(objMessage);
                } else {
                    let objMessage = new Message("Error",error);
                    res.status(400).send(objMessage);
                }
            })
        } else {
            let objError = new Message("Error","Bad Session");
            res.status(401).send(objError);
        }
        
    })
})

app.post("/harvests",(req,res,next)=> {
    let strSessionID = req.query.sessionid || req.body.sessionid;
    let strHarvestID = uuidv4();
    let strProduct = req.query.task || req.body.task;
    let strQuantity = req.query.quantity || req.body.quantity;
    let strUnitOfMeasure = req.query.unitofmeasure || req.body.unitofmeasure;
    
    getSessionDetails(strSessionID,function(objSession){
        if(objSession){
            pool.query("INSERT INTO tblHarvests VALUES(?,?,?,SYSDATE(),?,?,?)",[strHarvestID,strProduct,objSession.Email,strQuantity,strUnitOfMeasure,objSession.User.Farm.FarmID], function(error, results){
                if(!error){
                    let objMessage = new Message("HarvestID",strHarvestID);
                    res.status(201).send(objMessage);
                } else {
                    let objMessage = new Message("Error",error);
                    res.status(400).send(objMessage);
                }
            })
        } else {
            let objError = new Message("Error","Bad Session");
            res.status(401).send(objError);
        }
        
    })
})

app.put("/harvests",(req,res,next)=> {
    let strSessionID = req.query.sessionid || req.body.sessionid;
    let strHarvestID = req.query.harvestid || req.body.harvestid;
    let strProduct = req.query.task || req.body.task;
    let strQuantity = req.query.quantity || req.body.quantity;
    let strUnitOfMeasure = req.query.unitofmeasure || req.body.unitofmeasure;
    
    getSessionDetails(strSessionID,function(objSession){
        if(objSession){
            pool.query("UPDATE tblHarvests SET Product = ?, Quantity = ?, UnitOfMeasure = ? WHERE FarmID = ? AND HarvestID = ?",[strProduct,strQuantity,strUnitOfMeasure,objSession.User.Farm.FarmID, strHarvestID], function(error, results){
                if(!error){
                    let objMessage = new Message("Success","Harvest Updated");
                    res.status(201).send(objMessage);
                } else {
                    let objMessage = new Message("Error",error);
                    res.status(400).send(objMessage);
                }
            })
        } else {
            let objError = new Message("Error","Bad Session");
            res.status(401).send(objError);
        }
        
    })
})

app.delete("/harvests",(req,res,next)=> {
    let strSessionID = req.query.sessionid || req.body.sessionid;
    let strHarvestID = req.query.harvestid || req.body.harvestid;
    
    getSessionDetails(strSessionID,function(objSession){
        if(objSession){
            pool.query("DELETE FROM tblHarvests WHERE FarmID = ? AND HarvestID = ?",[objSession.User.Farm.FarmID, strHarvestID], function(error, results){
                if(!error){
                    let objMessage = new Message("Success","Harvest Deleted");
                    res.status(201).send(objMessage);
                } else {
                    let objMessage = new Message("Error",error);
                    res.status(400).send(objMessage);
                }
            })
        } else {
            let objError = new Message("Error","Bad Session");
            res.status(401).send(objError);
        }
        
    })
})

app.post("/farmassignment",(req,res,next)=> {
    let strSessionID = req.query.sessionid || req.body.sessionid;
    let strAssignmentID = uuidv4();
    let strUser = req.query.user || req.body.user;
    
    getSessionDetails(strSessionID,function(objSession){
        if(objSession){
            if(objSession.IsOwner == true){
                pool.query("INSERT INTO tblFarmAssingments VALUES(?, ?, ?, false)",[strAssignmentID,objSession.User.Farm.FarmID,strUser], function(error, results){
                    if(!error){
                        let objMessage = new Message("AssignmentID",strAssignmentID);
                        res.status(201).send(objMessage);
                    } else {
                        let objMessage = new Message("Error",error);
                        res.status(400).send(objMessage);
                    }
                })
            }
            else {
                let objError = new Message("Error","Only Owners Are Authorized For This Function ");
                res.status(401).send(objError);
            }
        } else {
            let objError = new Message("Error","Bad Session");
            res.status(401).send(objError);
        }
        
    })
    
})

app.post("/position",(req,res,next)=> {
    let strSessionID = req.query.sessionid || req.body.sessionid;
    let strEntry = uuidv4();
    let strUser = req.query.user || req.body.user;
    let strTitle = req.query.title || req.body.title;
    let strPayRate = req.query.payrate || req.body.payrate;
    let strEffectiveDate = req.query.effectivedate || req.body.effectivedate;
    getSessionDetails(strSessionID,function(objSession){
        if(objSession){
            if(objSession.IsOwner == true){
                pool.query("INSERT INTO tblPosition VALUES(?, ?, ?, ?, ?, ?)",[strEntry,strUser,strTitle,strPayRate,strEffectiveDate,objSession.User.Farm.FarmID], function(error, results){
                    if(!error){
                        let objMessage = new Message("PositionID",strEntry);
                        res.status(201).send(objMessage);
                    } else {
                        let objMessage = new Message("Error",error);
                        res.status(400).send(objMessage);
                    }
                })
            }
            else {
                let objError = new Message("Error","Only Owners Are Authorized For This Function ");
                res.status(401).send(objError);
            }
        } else {
            let objError = new Message("Error","Bad Session");
            res.status(401).send(objError);
        }
        
    })
    
})

app.get("/tasks", (req,res,next) => {
    let strSessionID = req.query.sessionid || req.body.sessionid;
    getSessionDetails(strSessionID,function(objSession){
        pool.query("SELECT * FROM tblTasks WHERE FarmID = ?",objSession.User.Farm.FarmID, function(error,results){
            if(!error){
                res.status(200).send(results)
            } else {
                let objError = new Message("Error",error);
                res.status(400).send(objError);
            }
            
        })
    })
})

app.post("/tasks",(req,res,next)=> {
    let strSessionID = req.query.sessionid || req.body.sessionid;
    let strTaskID = uuidv4();
    let strNotes = req.query.notes || req.body.notes;
    let strTaskName = req.query.taskname || req.body.taskname;
    
    getSessionDetails(strSessionID,function(objSession){
        if(objSession){
            pool.query("INSERT INTO tblTasks VALUES(?,?,?,'ACTIVE',?)",[strTaskID,strTaskName,strNotes,objSession.User.Farm.FarmID], function(error, results){
                if(!error){
                    let objMessage = new Message("TaskID",strTaskID);
                    res.status(201).send(objMessage);
                } else {
                    let objMessage = new Message("Error",error);
                    res.status(400).send(objMessage);
                }
            })
        } else {
            let objError = new Message("Error","Bad Session");
            res.status(401).send(objError);
        }
        
    })
})

app.get("/unitofmeasure", (req,res,next) => {
    let strSessionID = req.query.sessionid || req.body.sessionid;
    getSessionDetails(strSessionID,function(objSession){
        pool.query("SELECT * FROM tblUnitOfMeasure WHERE FarmID = ?",objSession.User.Farm.FarmID, function(error,results){
            if(!error){
                res.status(200).send(results)
            } else {
                let objError = new Message("Error",error);
                res.status(400).send(objError);
            }
            
        })
    })
})
app.post("/unitofmeasure",(req,res,next)=> {
    let strSessionID = req.query.sessionid || req.body.sessionid;
    let strAbbreviation = req.query.abbreviation || req.body.abbreviation;
    let strDescription = req.query.description || req.body.description;
    
    getSessionDetails(strSessionID,function(objSession){
        if(objSession){
            pool.query("INSERT INTO tblUnitOfMeasure VALUES(?,?,'ACTIVE',?)",[strAbbreviation,strDescription,objSession.User.Farm.FarmID], function(error, results){
                if(!error){
                    let objMessage = new Message("Success","Unit Of Measure Added");
                    res.status(201).send(objMessage);
                } else {
                    let objMessage = new Message("Error",error);
                    res.status(400).send(objMessage);
                }
            })
        } else {
            let objError = new Message("Error","Bad Session");
            res.status(401).send(objError);
        }
        
    })
})

app.put("/unitofmeasure",(req,res,next)=> {
    let strSessionID = req.query.sessionid || req.body.sessionid;
    let strAbbreviation = req.query.abbreviation || req.body.abbreviation;
    let strDescription = req.query.description || req.body.description;
    let strStatus = req.query.status || req.body.status;
    getSessionDetails(strSessionID,function(objSession){
        if(objSession){
            pool.query("UPDATE tblUnitOfMeasure SET Status = ?, Description = ? WHERE Abbreviation = ? AND FarmID = ?",[strStatus, strDescription, strAbbreviation,objSession.User.Farm.FarmID], function(error, results){
                if(!error){
                    let objMessage = new Message("Success","Unit Of Measure Updated");
                    res.status(201).send(objMessage);
                } else {
                    let objMessage = new Message("Error",error);
                    res.status(400).send(objMessage);
                }
            })
        } else {
            let objError = new Message("Error","Bad Session");
            res.status(401).send(objError);
        }
        
    })
})

app.get("/harvests", (req,res,next) => {
    let strSessionID = req.query.sessionid || req.body.sessionid;
    getSessionDetails(strSessionID,function(objSession){
        pool.query("SELECT * FROM tblHarvests WHERE FarmID = ?",objSession.User.Farm.FarmID, function(error,results){
            if(!error){
                res.status(200).send(results)
            } else {
                let objError = new Message("Error",error);
                res.status(400).send(objError);
            }
            
        })
    })
})

app.get("/test", (req,res,next)=>{
    let strFarmID = req.query.farmid || req.body.farmid;
    console.log(strFarmID);
    getFarmByID(strFarmID,function(objFarm){
        if(objFarm){
            res.status(200).send(objFarm);
        } else {
            let objError = new Message("Error","Farm Does Not Exist");
            res.status(400).send(objError);
        }
        
    })
})

// End Step Four

// Step Five
function getSessionDetails(strSessionID,callback){
    pool.query('SELECT * FROM tblSessions LEFT JOIN tblUsers ON tblSessions.UserID = tblUsers.Email LEFT JOIN tblFarmAssignment ON tblSessions.UserID = tblFarmAssignment.User WHERE SessionID = ?',[strSessionID], function(error, results){
        if(!error){
            let objFarm;
            getFarmByID(strFarmID,function(objReturnedFarm){
                objFarm = objReturnedFarm;
                let objUser = new User(results[0].Email,results[0].FirstName,results[0].LastName,results[0].MobileNumber,objFarm,results[0].IsOwner);
                let objSession = new Session(results[0].SessionID,objUser,results[0].StartDateTime,null);
                return objSession;
            })
            
        } else {
          return null;
        }
    })
}

// Example function using the async pool.query with a callback
function getFarmByID(strFarmID,callback){
    pool.query('SELECT * FROM tblFarms WHERE FarmID = ?',[strFarmID], function(error, results){
        if(!error){
            if(results.length > 0){
                callback(new Farm(results[0].FarmID,results[0].FarmName,results[0].StreetAddress1,results[0].StreetAddress2,results[0].City,results[0].State,results[0].ZIP));
            } else {
                callback(null);
            }
        } else {
          callback(null);
        }
    })
}
function getFarmByUserID(strUserID,callback){
    pool.query('SELECT tblFarms.* FROM tblFarmAssignment LEFT JOIN tblFarm ON tblFarmAssignment.FarmID = tblFarm.FarmID WHERE User = ?',[strUserID], function(error, results){
        if(!error){
            if(results.length > 0){
                callback(new Farm(results[0].FarmID,results[0].FarmName,results[0].StreetAddress1,results[0].StreetAddress2,results[0].City,results[0].State,results[0].ZIP));
            } else {
                callback(null);
            }
        } else {
          callback(null);
        }
    })
}
function getUserBySessionID(strSessionID,callback){
    pool.query('SELECT * FROM tblUsers LEFT JOIN tblFarmAssignments ON tblUsers.Email = tblFarmAssingments.User LEFT JOIN tblFarms ON tblFarmAssignments.FarmID = tblFarms.FarmID WHERE Email = (SELECT UserID FROM tblSessions WHERE SessionID = ?',[strSessionID], function(error, results){
        if(!error){
            if(results.length > 0){
                console.log(results);
                callback(new User(results[0].Email,results[0].FirstName,results[0].LastName,results[0].MobileNumber,null,null));
            } else {
                callback(null);
            }
        } else {
          callback(null);
        }
    })
}
// End Step Five