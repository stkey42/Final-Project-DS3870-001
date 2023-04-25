const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const bodyParser = require('body-parser');
const { json } = require('body-parser');
const pool = mysql.createPool({
    host:'localhost',
    user:'root',
    password:'Mickey2023!',
    database:'finalproject'
})

const HTTP_PORT = 8000;

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

var app = express();
app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.text());

app.listen(HTTP_PORT, () => {
    console.log('Our server is listening on port ' + HTTP_PORT);
})



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
app.post("/farm", (req,res,next) => {
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
    pool.query('INSERT INTO tblFarms VALUES(?, ?, ?, ?, ?,?,?)',[strFarmID, strFarmName, strStreetAddress1, strStreetAddress2, strCity,strState,strZIP], function(error, results){
        if(!error){
            bcrypt.hash(strPassword, 10).then(hash => {
                strPassword = hash;
                pool.query('INSERT INTO tblUsers VALUES(?, ?, ?, ?, ?,SYSDATE())',[strEmail, strFirstName, strLastName, strPreferredName, strPassword], function(error, results){
                    if(!error){
                        let objMessage = new Message("FarmID",strFarmID);
                        res.status(201).send(objMessage);
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
app.post("/product",(req,res,next)=> {
    let strSessionID = req.query.sessionid || req.body.sessionid;
    let strProductID = uuidv4();
    let strShortName = req.query.shortname || req.body.shortname;
    let strLongName = req.query.longname || req.body.longname;
    let strDescription = req.query.description || req.body.description;
    getSessionDetails(strSessionID,function(objSession){
        if(objSession){
            pool.query("INSERT INTO tblProducts VALUES(?, ?, ?, ?, 'ACTIVE',?)",[strProductID,strShortName,strLongName,strDescription,objSession.Farm.FarmID], function(error, results){
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
app.post("/rawmaterial",(req,res,next)=> {
    let strSessionID = req.query.sessionid || req.body.sessionid;
    let strMaterialID = uuidv4();
    let strRelatedProduct = req.query.shortname || req.body.shortname;
    let strQuantity = req.query.longname || req.body.longname;
    let strUnitOfMeasure = req.query.description || req.body.description;
    let strCost = req.query.description || req.body.description;
    getSessionDetails(strSessionID,function(objSession){
        if(objSession){
            pool.query("INSERT INTO tblRawMaterials VALUES(?, ?, ?, ?,GETDATE(),?,?,?,?)",[strMaterialID,strDescription,strRelatedProduct,objSession.Email,strQuantity,strUnitOfMeasure,strCost,objSession.Farm.FarmID], function(error, results){
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
app.post("/tasklog",(req,res,next)=> {
    let strSessionID = req.query.sessionid || req.body.sessionid;
    let strTaskLogID = uuidv4();
    let strTask = req.query.task || req.body.task;
    
    getSessionDetails(strSessionID,function(objSession){
        if(objSession){
            pool.query("INSERT INTO tblTaskLog VALUES(?,?,?,GETDATE(),NULL,?)",[strTaskLogID,strTask,objSession.Email,objSession.Farm.FarmID], function(error, results){
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
app.post("/harvests",(req,res,next)=> {
    let strSessionID = req.query.sessionid || req.body.sessionid;
    let strHarvestID = uuidv4();
    let strProduct = req.query.task || req.body.task;
    let strQuantity = req.query.quantity || req.body.quantity;
    let strUnitOfMeasure = req.query.unitofmeasure || req.body.unitofmeasure;
    
    getSessionDetails(strSessionID,function(objSession){
        if(objSession){
            pool.query("INSERT INTO tblHarvests VALUES(?,?,?,GETDATE(),?,?,?)",[strHarvestID,strProduct,objSession.Email,strQuantity,strUnitOfMeasure,objSession.Farm.FarmID], function(error, results){
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
app.post("/farmassignment",(req,res,next)=> {
    let strSessionID = req.query.sessionid || req.body.sessionid;
    let strAssignmentID = uuidv4();
    let strUser = req.query.user || req.body.user;
    
    getSessionDetails(strSessionID,function(objSession){
        if(objSession){
            if(objSession.IsOwner == true){
                pool.query("INSERT INTO tblFarmAssingments VALUES(?, ?, ?, false)",[strAssignmentID,objSession.Farm.FarmID,strUser], function(error, results){
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
                pool.query("INSERT INTO tblPosition VALUES(?, ?, ?, ?, ?, ?)",[strEntry,strUser,strTitle,strPayRate,strEffectiveDate,objSession.Farm.FarmID], function(error, results){
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
        pool.query("SELECT * FROM tblTasks WHERE FarmID = ?",objSession.Farm.FarmID, function(error,results){
            if(!error){
                res.status(200).send(results)
            } else {
                let objError = new Message("Error",error);
                res.status(400).send(objError);
            }
            
        })
    })
})
app.get("/unitofmeasure", (req,res,next) => {
    let strSessionID = req.query.sessionid || req.body.sessionid;
    getSessionDetails(strSessionID,function(objSession){
        pool.query("SELECT * FROM tblUnitOfMeasure WHERE FarmID = ?",objSession.Farm.FarmID, function(error,results){
            if(!error){
                res.status(200).send(results)
            } else {
                let objError = new Message("Error",error);
                res.status(400).send(objError);
            }
            
        })
    })
})
app.get("/harvests", (req,res,next) => {
    let strSessionID = req.query.sessionid || req.body.sessionid;
    getSessionDetails(strSessionID,function(objSession){
        pool.query("SELECT * FROM tblHarvests WHERE FarmID = ?",objSession.Farm.FarmID, function(error,results){
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