import * as vscode from 'vscode';
import { MakerCADPreview } from './stlViewer';

export function activate(context: vscode.ExtensionContext) {
	MakerCADPreview.register(context)
}

export function deactivate() {}
