import * as vscode from 'vscode'
import { Model } from './model';
import { ViewAction } from './media/viewmodel';
import { Config } from './config';

export class MakerCADPreview {
    public static preview: MakerCADPreview | undefined
    public config: Config
    private disposables: vscode.Disposable[]

    public static register(context: vscode.ExtensionContext) {
        const disposable = vscode.commands.registerCommand('makercad-vscode.preview', () => {
            MakerCADPreview.createOrShow(context)
        });
	    context.subscriptions.push(disposable);
    }

    public static createOrShow(context: vscode.ExtensionContext) {
        const panel = vscode.window.createWebviewPanel(
            MakerCADPreview.viewType,
            "MakerCad Preview",
            vscode.ViewColumn.Two,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'out', 'media')]
            }
        )

        MakerCADPreview.preview = new MakerCADPreview(context, panel)
    }

    public static readonly viewType = 'MakerCAD.StlViewer'
    private model: Model

    constructor(private readonly context: vscode.ExtensionContext, private readonly view: vscode.WebviewPanel) {
        const configuration = vscode.workspace.getConfiguration("makercadExtension")
        this.config = {
            modelViewDist: configuration.get("modelViewDist") || 50
        }
        this.model = new Model(this.config)
        this.disposables = []
        this.setupWebviewPanel(view)
        this.watchStlFiles()
        this.view.onDidDispose(() => {
            this.disposables.forEach(disposable => { 
                disposable.dispose()
            });
            this.disposables = []
        })
    }

    watchStlFiles() {
        const watcher = vscode.workspace.createFileSystemWatcher('**/*.stl')
        this.disposables.push(watcher)
        const stlChangeEvent = async (uri: vscode.Uri) => {
            console.log("detected change in ", uri)
            await this.updateWebview(this.view)
        }
        this.disposables.push(watcher.onDidChange(stlChangeEvent))
        this.disposables.push(watcher.onDidChange(stlChangeEvent))
        this.disposables.push(watcher.onDidCreate(stlChangeEvent))
    }

    setupWebviewPanel(webviewPanel: vscode.WebviewPanel): Thenable<void> | void {
        webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview)

        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.uri.toString().endsWith('.stl')) {
                this.updateWebview(webviewPanel)
            }
        })
        this.disposables.push(changeDocumentSubscription)

        webviewPanel.webview.onDidReceiveMessage(message => {
            this.updateWebview(webviewPanel, message)
        })

        return this.updateWebview(webviewPanel)
    }

    private async updateWebview(webviewPanel: vscode.WebviewPanel, message?: ViewAction) {
        let vm = await this.model.updateViewModel(message)
        webviewPanel.webview.postMessage(vm)
    }

    private getHtmlForWebview(webview: vscode.Webview): string {
        const extensionUri = this.context.extensionUri
        const scriptPath = vscode.Uri.joinPath(extensionUri, 'out', 'media', 'main.js')
        const scriptUri = webview.asWebviewUri(scriptPath)
        const cssPath = vscode.Uri.joinPath(extensionUri, 'out', 'media', 'main.css')
        const cssUri = webview.asWebviewUri(cssPath)
        return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <!-- <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; img-src ${webview.cspSource} https:; script-src ${webview.cspSource};"> -->
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no">
    <title>MakerCAD Preview</title>
    <link rel="stylesheet" type="text/css" href="${cssUri}">
  </head>
  <body>
    <div id="viewer">
        <div id="tools">
            <select id="fileSelector">
            </select>
        </div>
    </div>
    <script>
        const vscode = acquireVsCodeApi();
    </script>
    <script src="${scriptUri}"></script>
  </body>
</html>`
    }
}