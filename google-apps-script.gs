// Google Apps Script Code

function doPost(e) {
  try {
    // Parse the incoming data
    const content = JSON.parse(e.postData.getDataAsString());
    const data = content;
    
    // Get the active spreadsheet and the "Videos Carreras" sheet
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName("Videos Carreras");
    
    if (!sheet) {
      throw new Error("Sheet 'Videos Carreras' not found");
    }
    
    // Get the last row
    const lastRow = sheet.getLastRow();
    
    // Prepare the data to write
    const rowData = [
      data.requestDate || '',
      data.videoTitle || '',
      data.description || '',
      data.topic || '',
      data.avatarId || '',
      data.id || '',
      data.userEmail || '',
      data.tone || '',
      data.videoCategory || '',
      data.nombreEmpresa || '',
      data.callToAction || '',
      data.specificCallToAction || ''
    ];

    // Log the data being written
    Logger.log('Writing data to row: ' + JSON.stringify(rowData));
    
    // Write the data to the next row
    sheet.getRange(lastRow + 1, 1, 1, rowData.length).setValues([rowData]);
    
    // Return success response
    var response = ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Data successfully written to sheet",
      data: rowData
    })).setMimeType(ContentService.MimeType.JSON);
    
    return response;
    
  } catch (error) {
    // Log and return error
    Logger.log('Error in doPost: ' + error.toString());
    var errorResponse = ContentService.createTextOutput(JSON.stringify({
      error: "Error processing request: " + error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
    
    return errorResponse;
  }
}
