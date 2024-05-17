/*
 * join_tsv.js
 * 
 * Copyright 2016 Yec'han Laizet <y.laizet@bordeaux.unicancer.fr>
 * MIT license
 * 
 */
var keySep = "__";
var fieldSep = "\t";

var wb1, wb2;

var parserConfig = {delimiter: fieldSep, skipEmptyLines: true};

var alphaToDigit = function(val) {
    var base = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', i, j, result = 0;
    for (i = 0, j = val.length - 1; i < val.length; i += 1, j -= 1) {
        result += Math.pow(base.length, j) * (base.indexOf(val[i]) + 1);
    }
    return result;
};

var selectResult = function() {
    document.getElementById("contentOutput").select();
};

var clearContentOuput = function() {
    document.getElementById("contentOutput").value = "";
};

var loadDemo = function() {
    document.getElementById("content1").value = "id	couleur	taille\n1	rouge	25\n2	vert	68";
    document.getElementById("content2").value = "couleur	forme	id\njaune	carre	4\nrouge	rond	1\nbleu	oval	9";
    document.getElementById("cols1").value = "1,2";
    document.getElementById("cols2").value = "C,1";
    clearContentOuput();
};

var paramsOk = function() {
    var isOk = true;
    if (document.getElementById("content1").validity.valid === false) {
        isOk = false;
    }
    if (document.getElementById("content2").validity.valid === false) {
        isOk = false;
    }
    if (document.getElementById("cols1").validity.valid === false) {
        isOk = false;
    }
    if (document.getElementById("cols2").validity.valid === false) {
        isOk = false;
    }
    return isOk;
};

var getColsById = function(elmtId) {
    var colsStr = document.getElementById(elmtId).value;
    return colsStr.replace(' ', "").replace(/,+$/, "").replace(/^,+/, "").split(',');
};

var getColsByIdAsNumeric = function(elmtId) {
    var cols = getColsById(elmtId);
    for (col in cols) {
        if (new RegExp(/^[A-Z]+$/).test(cols[col].toUpperCase())) {
            cols[col] = alphaToDigit(cols[col].toUpperCase());
        }
    }
    return cols;
};

var parseTsvById = function(elmtId) {
    var tsv = document.getElementById(elmtId).value;
    var data = Papa.parse(tsv, parserConfig);
    return data;
};

var getKeyStr = function(cols, lineData) {
    var keys = [];
    for (col in cols) {
        keys.push(lineData[parseInt(cols[col]) - 1]);
    }
    return keys.join(keySep);
};

var getMap = function(side) {
    var data = parseTsvById("content" + side);
    var cols = getColsByIdAsNumeric("cols" + side);
    var sideMap = {};
    for (line in data.data) {
        var keyStr = getKeyStr(cols, data.data[line]);
        sideMap[keyStr] = data.data[line];
    }
    return sideMap;
};

var rename_duplicated_colnames = function(dataJ) {
    var counts = {};
    for (var i = 0; i < dataJ.data[0].length; i++) {
        var col = dataJ.data[0][i];
        if (counts[col] !== undefined && counts[col] >= 1) {
            counts[col]++;
            dataJ.data[0][i] = dataJ.data[0][i] + "_" + counts[col];
        } else {
            counts[col] = 1;
        }
    }
    return dataJ
}

var mergeTables = function() {
    if (paramsOk()) {
        var mapped = [];
        var dataJ = parseTsvById("content1");
        var leftLength = dataJ.data[0].length;
        var cols1 = getColsByIdAsNumeric("cols1");
        var map2 = getMap('2');
        for (line in dataJ.data) {
            var keyStr = getKeyStr(cols1, dataJ.data[line]);
            if (map2[keyStr] !== undefined) {
                mapped.push(keyStr);
                dataJ.data[line].push("==");
                dataJ.data[line] = dataJ.data[line].concat(map2[keyStr]);
            } else {
                dataJ.data[line].push("=?");
            }
        }
        for (key in map2) {
            if (mapped.indexOf(key) < 0) {
                var newLine = Array(leftLength).fill("");
                newLine.push("?=");
                newLine = newLine.concat(map2[key]);
                dataJ.data.push(newLine);
            }
        }
        rename_duplicated_colnames(dataJ);
        document.getElementById("contentOutput").value = Papa.unparse(dataJ, parserConfig);
    } else {
        clearContentOuput();
    }
};

var clearTable = function(tableId) {
    document.getElementById(tableId).value = "";
};

function ddl_tsv() {
    var output = document.getElementById('contentOutput').value;
    if (output === "") {
        mergeTables();
    }
    output = document.getElementById('contentOutput').value;
    saveAs(new Blob([output], {type:'application/csv'}), 'test.tsv');
}

function ddl_xlsx() {
    var output = document.getElementById('contentOutput').value;
    if (output === "") {
        mergeTables();
    }
    output = document.getElementById('contentOutput').value;
    data_as_json = Papa.parse(output, {delimiter: fieldSep, skipEmptyLines: true, header: true})
    const worksheet = XLSX.utils.json_to_sheet(data_as_json.data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "join");
    XLSX.writeFile(workbook, "Joined_tables.xlsx", { compression: true });
}

function to_csv(workbook, sheet) {
    workbook.SheetNames.forEach(function(sheetName) {
        var x;
        if (sheet === undefined) {
            sheet = sheetName;
        }
    });
    return XLSX.utils.sheet_to_csv(workbook.Sheets[sheet], {FS: fieldSep});
}

function removeOptions(selectDom) {
    var i;
    for(i=selectDom.options.length-1;i>=0;i--)
    {
        selectDom.remove(i);
    }
}

function populate_sheet_list(workbook, selectDom) {
    removeOptions(selectDom)
    var sheets = [];
    workbook.SheetNames.forEach(function(sheetName) {
        var option = document.createElement("option");
        option.text = sheetName;
        option.value = sheetName;
        selectDom.add(option);
    });
}

function updateCsv(target) {
    var workbook = window[target.id.replace("sheets", "wb")];
    var sheetName = target.options[target.selectedIndex].value;
    document.getElementById(target.id.replace("sheets", "content")).value = to_csv(workbook, sheetName);
}

function handleFile(e) {
    var targetName = e.target.name
    var files = e.target.files;
    var i, f;
    for (i = 0, f = files[i]; i != files.length; ++i) {
    var reader = new FileReader();
    var name = f.name;
    reader.onload = function(e) {
        var data = e.target.result;

        var workbook = XLSX.read(data, {type: 'binary'});
        window[targetName.replace("xlsx", "wb")] = workbook;
        var selectDom = document.getElementById(targetName.replace("xlsx", "sheets"));
        populate_sheet_list(workbook, selectDom);

        var csvTargetId = targetName.replace("xlsx", "content");
        document.getElementById(csvTargetId).value = to_csv(workbook);

        clearContentOuput();
    };
    reader.readAsBinaryString(f);
  }
}
