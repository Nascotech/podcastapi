let fullUrl = location.protocol + '//' + location.hostname + (location.port ? ':' + location.port : '');

let applyDatabase = (dbName) => {
    if (confirm("Are you sure, you want to apply " + dbName + " database ?")) {
        const xhttp = new XMLHttpRequest();
        xhttp.open("GET", fullUrl + `/api/applyOldDatabase/${dbName}`, false);
        xhttp.send();
        alert("Database " + dbName + " applied successfully.");
        location.reload();
    }
};

let removeDatabase = (dbName) => {
    if (confirm("Are you sure, you want to remove " + dbName + " database backup?")) {
        const xhttp = new XMLHttpRequest();
        xhttp.open("GET", fullUrl + `/api/removeDatabaseBackup/${dbName}`, false);
        xhttp.send();
        alert("Database " + dbName + " deleted successfully.");
        location.reload();
    }
};

let loadDatabaseList = () => {

    let xhttp = new XMLHttpRequest();
    xhttp.open("GET", fullUrl + "/api/getAllBackupDatabaseList", false);
    xhttp.send();

    let dbList = JSON.parse(xhttp.responseText);

    if (dbList.response.length > 0) {
        dbList.response.forEach(function (info, index) {
            let x = `
                <tr>
                    <td>${index + 1}</td>
                    <td>${info}</td>
                    <td class="text-center">
                        <button class='btn btn-info btn-xs' onClick="applyDatabase('${info}')"> Apply</button>
                        <button class="btn btn-danger btn-xs" onClick="removeDatabase('${info}')"> Remove</button>
                    </td>
                </tr>
            `;

            document.getElementById('db-list').innerHTML = document.getElementById('db-list').innerHTML + x;
        });
    } else {
        let x = `
            <tr class="no-data">
                <td colspan="4">No database list found</td>
            </tr>`;

        document.getElementById('db-list').innerHTML = document.getElementById('db-list').innerHTML + x;
    }
};

loadDatabaseList();
