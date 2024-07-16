const apiurl = "http://3.144.121.46";
var loggingIn = false;
var localStorage = window.localStorage;

function httpGet(theUrl)
{
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open( "GET", theUrl, false ); // false for synchronous request
    xmlHttp.send( null );
    return xmlHttp.responseText;
}
function httpGetWithAuth(theUrl, bearer)
{
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open( "GET", theUrl, false ); // false for synchronous request
    xmlHttp.setRequestHeader("Authorization", bearer);
    xmlHttp.send( null );
    return xmlHttp.responseText;
}
function httpPost(theUrl)
{
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open( "POST", theUrl, false ); // false for synchronous request
    xmlHttp.send( null );
    return xmlHttp.responseText;
}
function httpPostWithAuth(theUrl, bearer)
{
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open( "POST", theUrl, false ); // false for synchronous request
    xmlHttp.setRequestHeader("Authorization", bearer);
    xmlHttp.send( null );
    return xmlHttp.responseText;
}
function hash(string) {
    const utf8 = new TextEncoder().encode(string);
    return crypto.subtle.digest('SHA-256', utf8).then((hashBuffer) => {
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray
        .map((bytes) => bytes.toString(16).padStart(2, '0'))
        .join('');
      return hashHex;
    });
}

///
//      index.html functions
///

//easy alert function
function error(message){
    alert("error: " + message);
}

//sign in button
function login(){
    //preventing more than 1 request being sent
    if(loggingIn){
        return;
    }
    loggingIn = true;
    document.getElementById("loginError").textContent = "logging in...";


    //getting variables
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    hash(password).then((value) => {
        //sending request
        var response = JSON.parse(httpPost(apiurl + "/login?u=" + username + "&p=" + value));

        //checking for errors response["CODE"] != 200
        if(response["TOKEN"] == null){
            document.getElementById("loginError").textContent = response["MESSAGE"];
            loggingIn = false;
        }
        else{
            //extract token and save to cache
            //error(response["TOKEN"]["TOKEN"]);
            document.getElementById("loginError").textContent = "loading...";
            //saving the token
            localStorage.setItem("token", response["TOKEN"]["TOKEN"]);
            localStorage.setItem("username", response["USERNAME"]);
            localStorage.setItem("permissions", response["PERMISSIONS"]);


            console.log(response["TOKEN"]['TOKEN']);
            console.log(localStorage.getItem("token"));

            //going to dashboard
            window.location.replace("./dashboard.html");
        }
    });
}

//validates the login cookie, also checks for what page the window is on
function loadLoginCookie(){
    var cookie = localStorage.getItem("token");
    var currentPage = window.location.pathname.split("/")[window.location.pathname.split("/").length-1];

    //going to login if there is no cookie in saved data
    if(currentPage == "dashboard.html" && cookie == null || currentPage == "dashboard.html" && cookie == ""){
        window.location.replace("./index.html");
        return;
    }

    //going to dashboard if the cookie is not equal to null and the token is validated
    if(cookie != null && currentPage == "index.html" || cookie != "" && currentPage == "index.html"){
        document.getElementById("username").value = localStorage.getItem("username");

        //checking token
        var valid = checkLoginToken(cookie);
        if(valid[0] == true){
            window.location.replace("./dashboard.html");
        }
        else{
            localStorage.setItem("token", "");
        }
    }
    //if cookie not null and page is dashboard, verifying token
    else if (cookie != null && currentPage == "dashboard.html" || cookie != "" && currentPage == "dashboard.html"){
        //checking token
        var valid = checkLoginToken(cookie);
        if(valid[0] == false){
            localStorage.setItem("token", "");
            window.location.replace("./index.html");
        }
    }
    else{
        document.getElementById("username").innerHTML = localStorage.getItem("username");
    }
}

//sends post request to server
function checkLoginToken(token){
    var response = JSON.parse(httpPostWithAuth(apiurl + "/api/token", token));

    if(response["CODE"] == 200){
        return [true, response['MESSAGE']];
    }
    else{
        return [false, 0];
    }
}

function help(){

}


///
//      dashboard.html functions
///

//self explanatory
function createEmployee(){
    const username = document.getElementById("addusername").value;
    const permissions = document.getElementById("addpermissions").value;
    const otherdata = document.getElementById("addother").value;

    //regulating paramaters
    if(username == ""){
        alert("Username cannot be empty"); return;
    }
    //regulating what kind of values are entered into permissions
    else{
        //testing if the value is an integer
        try{
            var p = parseInt(permissions.toString());
            if(p > 5){   alert("Permissions # MUST be betwen 1-5 (1)"); return;     }
            else if(p < 1){     alert("Permissions # MUST be betwen 1-5 (2)"); return;  }
            else if(p.toString() == "NaN"){
                alert("Permissions # MUST be betwen 1-5 (2)"); return;
            }
        }
        catch (ex){
            console.log(ex);
            alert("Permissions # MUST be betwen 1-5 (3)"); return;
        }
    }

    var response = JSON.parse(httpPostWithAuth(apiurl + "/api/createuser?u=" + username + "&p=" + permissions + "&o=" + otherdata, localStorage.getItem("token")));

    //checking for errors
    if(response['CODE'] == 400){
        error(response['MESSAGE']);
    }
    else{
        //clearing fields
        document.getElementById("addusername").value = "";
        document.getElementById("addpermissions").value = "";
        document.getElementById("addother").value = "";

        loadEmployees();
    }
}

function loadEmployees(){
    var response = JSON.parse(httpGetWithAuth(apiurl + "/api/users", localStorage.getItem("token")));

    //clearing div
    document.getElementById("employeeListing").innerHTML = "";

    const prefab = "<div class=\"employeeBlock\">"
        + "<h5 style=\"float: left; position: absolute; margin-top: 0.5%;\">USERNAME</h5>"
        + "<h5 style=\"float: left; position: absolute; margin-left: 25%; margin-top: 0.5%;\">PERMISSIONS</h5>"
        + "<h5 style=\"float: left; position: absolute; margin-left: 45%; margin-top: 0.5%;\">OTHERDATA</h5>"
        + "<h5 onclick=\"deleteUser('DELETE_NAME');\" style=\"cursor:CURSOR_POINTER; color: #C70000; float: right; position: absolute; margin-left: 70%; margin-top: 0.5%;\">Delete User</h5></div>";

    //successful
    if(response['CODE'] == null){

        //going through each employee
        for(var i = 0; i < response['EMPLOYEES'].length; i++){
            var x = response['EMPLOYEES'][i];
            
            var listing = prefab.replace("USERNAME", x['USERNAME']);
            listing = listing.replace("PERMISSIONS", x['PERMISSIONS'] + "&nbsp;&nbsp;" + getPermissionName(x['PERMISSIONS']));
            listing = listing.replace("OTHERDATA", x['OTHERDATA']);
            listing = listing.replace("DELETE_NAME", x['PERMISSIONS'] == 5 ? "not-allowed" : x['USERNAME']);

            //making it so you can't delete admins
            listing = listing.replace("CURSOR_POINTER", x['PERMISSIONS'] == 5 ? "not-allowed" : "pointer");

            //adding it to the div
            document.getElementById("employeeListing").innerHTML += listing
        }
    }
    else{
        error(response['MESSAGE']);
    }
}

function deleteUser(username){
    if(username == 'not-allowed'){
        return;
    }

    var response = JSON.parse(httpPostWithAuth(apiurl + "/api/deleteuser?u=" + username, localStorage.getItem("token")));

    if(response['CODE'] == 200){
        //done
        loadEmployees();
    }
    else{
        error(response['MESSAGE']);
    }
}

function loadDeliveries(){
    var response = JSON.parse(httpGetWithAuth(apiurl + "/api/deliveries", localStorage.getItem("token")));

    //clearing div
    document.getElementById("deliveriesListing").innerHTML = "";

    const prefab = "<div class='delivery-block'>" +
                "<h2 class='eb1'># OF BOXES</h2>" +
                "<h3 class='eb2'>TYPE</h3>" +
                "<h3 class='eb3'>P/U</h3>" +
                "<h3 class='eb4'>COMPANY</h3>" +
                "<h3 class='eb5'>NAME/ADDRESS</h3>" +
                "<h5 class='eb6'>OTHERDATA</h5>" +
                "<h2 class='eb7'>JOB #</h2>" +
            "</div>";
    //successful
    if(response['CODE'] == null){

        //going through each employee
        for(var i = 0; i < response['DELIVERIES'].length; i++){
            var x = response['DELIVERIES'][i];
            
            var listing = prefab.replace("# OF BOXES", x['NUM_BOXES']);
            listing = listing.replace("TYPE", x['TYPE']);
            listing = listing.replace("P/U", x['PU']);
            listing = listing.replace("COMPANY", x['COMPANY']);
            listing = listing.replace("NAME/ADDRESS", x['NAMEADDR']);
            listing = listing.replace("OTHERDATA", x['OTHERDATA']);
            listing = listing.replace("JOB #", x['JOBNUM']);


            //making it so you can't delete admins
            listing = listing.replace("CURSOR_POINTER", x['PERMISSIONS'] == 5 ? "not-allowed" : "pointer");

            //adding it to the div
            document.getElementById("deliveriesListing").innerHTML += listing
        }
    }
    else{
        error(response['MESSAGE']);
    }
}

function createDelivery(){
    const boxes = document.getElementById("numBoxes").value;
    const type = document.getElementById("type").value;
    const pu = document.getElementById("pU").value;
    const company = document.getElementById("company").value;
    const nameaddr = document.getElementById("nameAddr").value;
    const otherdata = document.getElementById("other").value;
    const jobnum = document.getElementById("jobNum").value;

    //sending request
    var response = JSON.parse(httpPostWithAuth(apiurl + "/api/createdelivery?b=" +
        boxes +"&t=" +
        type + "&p=" +
        pu + "&c=" +
        company + "&n=" + 
        nameaddr + "&od=" +
        otherdata + "&job=" + jobnum, localStorage.getItem("token")));
    
    if(response['CODE'] != 200){
        error(response['MESSAGE']);
    }
    //result successfully
    else{
        //clearing fields
        document.getElementById("numBoxes").value = "";
        document.getElementById("type").value = "";
        document.getElementById("pU").value = "";
        document.getElementById("company").value = "";
        document.getElementById("nameAddr").value = "";
        document.getElementById("other").value = "";
        document.getElementById("jobNum").value = "";

        dashboard("deliveries-panel");
    }
}


//enables/disables each page that is on the dashboard, page is in reference to each div
function dashboard(page){
    var panelClasses = ['dashboard-panel', 'deliveries-panel', 'create-delivery-panel', 'records-panel', 'employees-panel', 'email-records-panel', 'app-log-panel'];

    //going through each panel and turning everything off except "page"
    for(var i = 0; i < panelClasses.length; i++){
        var x = panelClasses[i];
        var display = page==x ? 'inline' : 'none';
        
        var elements = document.getElementsByClassName(x);
        for(var b = 0; b < elements.length; b++){
            if(elements[b].nodeName == "center"){
                elements[b].style.display = display == "inline-block" ? "inline" : "none";
            }
            else{
                elements[b].style.display = display;
            }
        }
    }

    //more of custom data
    if(page == "employees-panel"){
        loadEmployees();
    }
    else if (page == "deliveries-panel"){
        loadDeliveries();
    }
}

//checks which function to run after the cookie was loaded
function windowLoaded(){
    var currentPage = window.location.pathname.split("/")[window.location.pathname.split("/").length-1];

    //checking if it's dashboard
    if(currentPage == "dashboard.html"){
        dashboard("dashboard-panel");
        permissions();
        document.getElementById("logoutButtonText").textContent = "" + localStorage.getItem("username");
    }
}

//logs out of account and redirects to login page
function logout(){
    localStorage.setItem("token", "");
    window.location.replace("./index.html");
}

//if a user doesn't have the elevated permissions, we need to hide certain buttons
function permissions(){
    var perms = parseInt(localStorage.getItem("permissions"));

    console.log(perms);

    //level 1 - View Deliveries
    if(perms < 2){
        document.getElementById("email-records-button").style.display = "none";
        document.getElementById("app-log-button").style.display = "none";
        document.getElementById("employees-button").style.display = "none";
        document.getElementById("delivery-records-button").style.display = "none";
        document.getElementById("new-delivery-button").style.display = "none";
    }
    //level 2 - Add/Remove Deliveries
    else if (perms < 3){
        document.getElementById("email-records-button").style.display = "none";
        document.getElementById("app-log-button").style.display = "none";
        document.getElementById("employees-button").style.display = "none";
        document.getElementById("delivery-records-button").style.display = "none";
    }
    //level 3 - View Delivery Records
    else if (perms < 4){
        document.getElementById("app-log-button").style.display = "none";
        document.getElementById("employees-button").style.display = "none";
    }
    //level 4 - Edit Delivery Records
    else if (perms < 5){        
        document.getElementById("app-log-button").style.display = "none";
        document.getElementById("employees-button").style.display = "none";
    }
    //level 5 - dont need to do anything
}

//returns a string like guest, administrator, etc
function getPermissionName(perm){
    switch(perm){
        case 1:
            return "Reader <span class=\"dot\" style=\"background-color: grey;\"></span>"; break;
        case 2:
            return "Contributor <span class=\"dot\" style=\"background-color: #7aff82;\"></span>"; break;
        case 3:
            return "Standard <span class=\"dot\" style=\"background-color: #a8ff1c;\"></span>"; break;
        case 4:
            return "Owner <span class=\"dot\" style=\"background-color: #ffa41c;\"></span>"; break;
        case 5:
            return "Administrator <span class=\"dot\" style=\"background-color: #ff511c;\"></span>"; break;
        default:
            return ""; break;
    }
}

//prints out the div
function printDiv(divName) {
    var printContents = document.getElementById(divName).innerHTML;
    var originalContents = document.body.innerHTML;
    document.getElementById("sideBar").style.display = "none";
    //document.body.innerHTML = header + printContents;

    window.print();
    document.getElementById("sideBar").style.display = "block";

    document.body.innerHTML = originalContents;
}


window.addEventListener("load", (event) => {
    loadLoginCookie();

    windowLoaded();
  });