import { DocumentMetaData, DocumentUrlHistory, StorageLib, S3Config, DocusaurusGlobalDataSplit } from '../types';
import fs from 'fs';
import path from 'path';
import S3Lib from './s3';
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  NoSuchKey,
} from '@aws-sdk/client-s3';
import lodash from 'lodash/fp';

export default class AWSDocumentTrackingLib {
  s3Config: S3Config;
  storageInstance: StorageLib<S3Client>;

  constructor(s3Config: S3Config) {
    const { region, accessKeyId, secretAccessKey } = s3Config;

    this.s3Config = s3Config;
    this.storageInstance = new S3Lib({
      region,
      accessKeyId,
      secretAccessKey,
    });
  }

  async trackChanges(dirName: string): Promise<DocumentUrlHistory[]> {


    // const contents = fs.readdirSync(dirName, { withFileTypes: true });
    // Filter out only directories
    // const childFolders = contents
    //   .filter((item) => item.isDirectory())
    //   .map((item) => path.join(dirName, item.name));
    
    // childFolders.map(childFolder => {
    //   console.log("Get metadata from", childFolder);
    //   documentsMetaData.push(...this.getCurrentFileMetaData(childFolder));
    //   console.log("metadata", documentsMetaData);
    // })

    const documentsMetaData: DocumentMetaData[] = this.getCurrentFileMetaData(dirName);


    // load from S3Lib
    const instance = this.storageInstance.getInstance();
    const fileUrlChanges = await this.detectDocumentChanges(
      instance,
      documentsMetaData
    );
    // console.log("File URL changes:", fileUrlChanges);
    const bucketParams = {
      Bucket: this.s3Config.bucket,
      Key: this.s3Config.key,
      Body: JSON.stringify(fileUrlChanges),
    };
    await instance.send(new PutObjectCommand(bucketParams));
    fs.writeFileSync("fileUrlChanges.json", JSON.stringify(fileUrlChanges));
    return fileUrlChanges;
  }

  private async detectDocumentChanges(
    instance: S3Client,
    documentsMetaData: DocumentMetaData[]
  ): Promise<DocumentUrlHistory[]> {
    let fileContent = '[]';
    const getObjectCommand = new GetObjectCommand({
      Bucket: this.s3Config.bucket,
      Key: this.s3Config.key,
    });

    try {
      const getFilesTask = await instance.send(getObjectCommand);
      fileContent = (await getFilesTask.Body?.transformToString()) || '[]';
    } catch (err) {
      // Catch the error and continue if it is "NoSuchKey" (file does not exist)
      // Re-throw the error otherwise
      if (!(err instanceof NoSuchKey)) {
        throw err;
      }
    }

    let trackingFiles: DocumentUrlHistory[] = [];
    const remoteTrackingFiles: DocumentUrlHistory[] = JSON.parse(fileContent);

    
    
    // Compare the changes
    if (!lodash.isEmpty(remoteTrackingFiles)) {
      trackingFiles = documentsMetaData.map((item) => {
        const remoteFile = lodash.find<DocumentUrlHistory>(
          (remoteItem) => remoteItem.id === item.unversionedId && !remoteItem.removed
        )(remoteTrackingFiles);

        if (!lodash.isNil(remoteFile)) {
          if (item.permalink !== remoteFile.to) {
            const currentPaths = documentsMetaData.map((item) => item.permalink);

            // Only redirect if URL is no longer valid
            if (!currentPaths.includes(remoteFile.to)) {
              remoteFile.from.push(remoteFile.to);
            }
            remoteFile.to = item.permalink;
          }

          return {
            ...remoteFile,
            from: [...new Set(remoteFile.from)], // use Set to remove duplicate "from" paths
          };
        }
        return { id: item.unversionedId, from: [], to: item.permalink };
      });
      // console.log("trackingFiles", trackingFiles);

      // Put records of removed docs at the end of the list
      const currentDocIds = trackingFiles.map(item => item.id);
      remoteTrackingFiles.forEach(item => {
        if (item.removed || !currentDocIds.includes(item.id)) {
          trackingFiles.push({
            ...item,
            from: [...new Set(item.from)],
            removed: true,
          });
        }
      });
    } else {
      trackingFiles = documentsMetaData.map((item) => {
        return {
          id: item.unversionedId,
          from: [],
          to: item.permalink,
        };
      });
    }
    return trackingFiles;
  }

  // Get Current docusaurus meta-data files
  private getCurrentFileMetaData(dirName: string) {
    console.log("Getting metadata from", dirName);
    const result: DocumentMetaData[] = [];

    const contents = fs.readdirSync(dirName, { withFileTypes: true });
    // Filter out only directories
    const childFolders = contents
      .filter((item) => item.isDirectory())
      .map((item) => path.join(dirName, item.name));

    // Get all the paths of the latest version of an instance
    const globalData: DocusaurusGlobalDataSplit = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '../../../../.docusaurus/globalData.json'), { encoding: 'utf-8' })
    );
    childFolders.map(childFolder => {
      fs.readdir(childFolder, function (err, filenames) {
        if (err) {
          console.error(err);
          return;
        }

        const ID = childFolder.split('/').pop();
        console.log("Getting globalData from", ID);
        const allVersions = globalData['docusaurus-plugin-content-docs'][ID!].versions.filter(version => version.isLast === true);
        const docPaths = allVersions.map(({ docs }) => docs.map(({ path }) => path)).flat();
        // console.log(docPaths);
        fs.writeFile('docPaths.json',JSON.stringify(docPaths),function(err){
          if(err) throw err;
        })
  
        filenames.forEach(function (filename) {
          var filePath = path.join(childFolder, filename);
          fs.readFile(filePath, 'utf-8', function (err, content) {
            if (err) {
              console.error(err);
              return;
            }
  
            const fileMetaData: DocumentMetaData = JSON.parse(content);
  
            // ignore files whose URL does not valid
            if (fileMetaData.permalink && docPaths.includes(fileMetaData.permalink)) {
              result.push(fileMetaData);
              // console.log(result[result.length-1]);
            }
          });
        });
      });
    })
    return result;
  }

}

