import { Config } from "../config"

export interface ViewAction {
    selectedFile: string,
}

export interface ViewModel {
    fileContents: ArrayBuffer,
    files: string[],
    selectedFile: number,
    config: Config
}