import { ViewAction, ViewModel } from "./media/viewmodel";
import * as vscode from 'vscode';
import path from "path";
import { openAsBlob } from "fs";
import { Config } from "./config";

// Serves to hold data relevant to the MakerCAD vs-code extension and produce the ViewModel which the HTML (view) uses
export class Model {
    private selectedFileIndex = 0;
    public stlFiles: vscode.Uri[] = [];
    public config: Config;

    constructor(configuration: Config) {
        this.findStlFiles().then((uris) => {
            this.stlFiles = uris
        })
        this.config = configuration
    }

    private async findStlFiles(): Promise<vscode.Uri[]> {
       return vscode.workspace.findFiles('**/*.stl') 
    }

    // Handle message from view
    public async updateViewModel(message?: ViewAction): Promise<ViewModel> {
        this.stlFiles = await this.findStlFiles()
        let fileData: ArrayBuffer = new ArrayBuffer()
        if (message && message.selectedFile) {
            let selectedFileIndex = this.stlFiles.findIndex((uri) => {
                return uri.toString().endsWith('/' + message.selectedFile)
            })
            if (selectedFileIndex >= 0) {
                this.selectedFileIndex = selectedFileIndex
            }
        }
        if (this.selectedFileIndex >= 0 && this.selectedFileIndex < this.stlFiles.length) {
            const blob = await openAsBlob(this.stlFiles[this.selectedFileIndex].fsPath)
            fileData = await blob.arrayBuffer()
        }
        let fileList: string[] = this.stlFiles.map( (uri): string => { return path.basename(uri.path) }) 
        return { fileContents: fileData, files: fileList, selectedFile: this.selectedFileIndex, config: this.config }
    }
}