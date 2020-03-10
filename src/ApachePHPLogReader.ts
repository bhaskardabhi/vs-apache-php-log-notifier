'use babel';

import * as vscode from 'vscode';

export default class ApachePHPLogReader {
    logRegex: RegExp;
    timeRegex: RegExp;
    registeredLog: any;

    constructor() {
        this.logRegex = new RegExp("\\[(.*)]\\s(PHP Fatal error:)\\s+(.*)", 'g');
        this.timeRegex = new RegExp("\\[(.*) (?:[a-zA-Z\\/]+)?](.*)", 'g');
        this.registeredLog = null;
    }

    getLogFilePath() {
        return vscode.workspace.getConfiguration('vsApachePhpLogNotifier').logFilePath;
    }

    isDisabled() {
        return vscode.workspace.getConfiguration('vsApachePhpLogNotifier').disable;
    }

    getCurrentDate() {
        var d = new Date(),
            month = '' + (d.getMonth() + 1),
            day = '' + d.getDate(),
            year = d.getFullYear();

        if (month.length < 2) { month = '0' + month; }
        if (day.length < 2) { day = '0' + day; }

        return [year, month, day].join('-');
    }

    readFileErrors(path: string) {
        var fs = require('fs'),
            that = this;

        return new Promise((resolve, reject) => {
            return fs.readFile(path, 'utf8', function (err: any, data: any) {
                if (!data) {
                    resolve([]);
                } else {
                    var currentMatch = data.match(that.logRegex);

                    resolve(
                        that.getErrorsWithTime(currentMatch ? currentMatch : [])
                    );
                }
            });
        });
    }

    getLatestErrorsFromFile(path: any, logs: Array<any>) {
        var that = this;
        if (!this.registeredLog) {
            return logs;
        }

        return logs.filter((logObject) => {
            if (!logObject.time) {
                return false;
            }

            return logObject.time > that.registeredLog;
        });
    }

    showErrorFromLogFile(path: string) {
        var that = this;

        this.readFileErrors(path).then((logs: any) => {
            var errors = that.getLatestErrorsFromFile(path, logs);
            
            errors.forEach((error) => {
                that.displayError(path, error);
            });
        });
    }

    getErrorsWithTime(logs: any) {
        var that = this;

        return logs.map((log: any) => {
            var time = that.getTimeOfLog(log);

            return {
                log: log,
                time: time ? new Date(time) : null
            };
        });
    }

    setLastErrorLog(path: string) {
        var that = this;
        if (!this.registeredLog) {
            this.registeredLog = null;
        }

        this.readFileErrors(path).then((logs: any) => {
            that.getLatestErrorsFromFile(path, logs).forEach((error) => {
                if (error.time && that.registeredLog < error.time) {
                    that.registeredLog = error.time;
                }
            });
        });
    }

    displayError(path: string, error: any) {
        var notifier = require('node-notifier'),
            that = this;

        notifier.notify({
            message: error.log.replace(this.logRegex, '$3'),
            timeout: 10
        }, function (err: any, response: any) {
            if (!that.registeredLog) {
                that.registeredLog = null;
            }

            if (error.time && that.registeredLog < error.time) {
                that.registeredLog = error.time;
            }

            // Open file
            if (response === 'activate') {
                require("fs").readFile(path, 'utf8', (err: any, data: any) => {
                    if (err) {
                        return true;
                    }

                    var lineNum = 0;
                    data.split(/\r?\n/).forEach((line: any, index: any) => {
                        if (line.includes(error.log)) {
                            lineNum = lineNum < index ? index : lineNum;
                        }
                    });

                    // vscode.workspace.openTextDocument(vscode.Uri.parse("file:///" + path))
                    // { initialLine: lineNum }
                    vscode.workspace.openTextDocument(path)
                        .then(doc => {
                            vscode.window.showTextDocument(doc, { preview: true });
                        });
                });
            }
        });
    }

    getTimeOfLog(log: any) {
        var time = log.replace(this.timeRegex, '$1');

        if (!time && time.length > 0) {
            return null;
        }

        return time;
    }
}