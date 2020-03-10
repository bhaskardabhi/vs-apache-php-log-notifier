// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import ApachePHPLogReader from './ApachePHPLogReader';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	let apachePHPLogReader = new ApachePHPLogReader();

	const fs = require('fs');
	const md5 = require('md5');
	let md5Previous:any = null;

	try {
		var filePath = apachePHPLogReader.getLogFilePath();

		fs.exists(filePath, (exists:any) => {
			if(exists){
				apachePHPLogReader.setLastErrorLog(filePath);

				fs.watch(filePath, (event: any) => {
					if (event === 'change') {
						var start = new Date().getTime();

						fs.readFile(filePath, { encoding: 'utf-8' }, (err: any, data: any) => {
							if (!err && md5Previous !== md5(data)){
								apachePHPLogReader.showErrorFromLogFile(filePath);
							}
						});

						var end = new Date().getTime();
						var time = end - start;
						console.log('Execution time: ' + time);
					}
				});
			}
		});
	} catch (err) {}
}

// this method is called when your extension is deactivated
export function deactivate() {}
