const multiparty = require("multiparty");
const path = require("path");
const fse = require("fs-extra");
const { loadAllPages } = require('../common/cache');
const { updateBlogCache } = require('../common/blogcache');

// 大文件存储目录
// demo directory
//let UPLOAD_DIR = path.resolve(__dirname, "..", "data");
const UPLOAD_DIR = (uploadpath) => {
    if(!uploadpath || uploadpath.trim() === '') return path.resolve(__dirname, "..", "data");
    else return path.resolve(__dirname, "..", `data/${uploadpath}`);
}
let UPLOAD_DIR_NEW = path.resolve(__dirname, "..", "data");
// 提取后缀名
// get file extension
const extractExt = filename => filename.slice(filename.lastIndexOf("."), filename.length);

// 写入文件流
// write to file stream
const pipeStream = (path, writeStream) => 
    new Promise(resolve => {
        const readStream = fse.createReadStream(path);
        //readStream.on("end", () => { fse.unlinkSync(path); resolve(); });
        readStream.pipe(writeStream);
        writeStream.on('finish', () => { fse.unlinkSync(path); resolve();  })
    });

// 提取 body
// extract body data from request
const resolvePost = req => 
    new Promise(resolve => {
        let chunk = "";
        req.on("data", data => { chunk += data; });
        req.on("end", () => { resolve(JSON.parse(chunk)); });
    });

// 创建临时文件夹用于临时存储 chunk
// 添加 chunkDir 前缀与文件名做区分
// create a directory for temporary storage of chunks
// add the 'chunkDir' prefix to distinguish it from the chunk name
//const getChunkDir = fileHash => path.resolve(UPLOAD_DIR, `chunkDir_${fileHash}`);
const getChunkDir = fileHash => path.resolve(UPLOAD_DIR_NEW, `chunkDir_${fileHash}`);

// 返回已上传的所有切片名
// return chunk names which is uploaded
const createUploadedList = async (fileHash) => {
    const data = fse.existsSync(getChunkDir(fileHash)) ? await fse.readdir(getChunkDir(fileHash)) : [];
    console.log('createUploadedList = ',data);
    return data;
}

// 合并切片
// merge file chunks
const mergeFileChunk = async (filePath, fileHash, size, totalChunks) => {
    const chunkDir = getChunkDir(fileHash);
    //const chunkPaths = await fse.readdir(chunkDir);
    let chunkPaths = await fse.readdir(chunkDir);
    //等待所有切片上传完成
    while(chunkPaths.length < totalChunks) { chunkPaths = await fse.readdir(chunkDir);}
    // 根据切片下标进行排序
    // 否则直接读取目录的获得的顺序会错乱
    // sort by chunk index
    // otherwise, the order of reading the directory may be wrong
    chunkPaths.sort((a, b) => a.split("-")[1] - b.split("-")[1]);

    // 并发写入文件
    // write file concurrently
    await Promise.all(
        chunkPaths.map((chunkPath, index) => {
            pipeStream(
                path.resolve(chunkDir, chunkPath),
                // 根据 size 在指定位置创建可写流
                // create write stream at the specified starting location according to size
                fse.createWriteStream(filePath, { start: index * size })
            );
        })
    );
    // 合并后删除保存切片的目录
    // delete chunk directory after merging
    //fse.rmdirSync(chunkDir);
    let _chunkPaths = await fse.readdir(chunkDir);
    //等待全部切片合并完成
    while(_chunkPaths.length > 0) { _chunkPaths = await fse.readdir(chunkDir); }
    fse.rmdirSync(chunkDir);
    await loadAllPages();
    await updateBlogCache();
};

module.exports = class {
    // 合并切片
    // merge chunks
    async handleMerge(req, res) {
        const data = await resolvePost(req);
        const { fileHash, filename, size, totalChunks, uploadpath } = data;
        const ext = extractExt(filename);
        //const filePath = path.resolve(UPLOAD_DIR, `${fileHash}${ext}`);
        UPLOAD_DIR_NEW = UPLOAD_DIR(uploadpath);
        const filePath = path.resolve(UPLOAD_DIR_NEW, filename);
        await mergeFileChunk(filePath, fileHash, size, totalChunks);
        res.end(JSON.stringify({ code: 0, message: "file merged success" }));
    }

    // 删除所有文件
    // delete all the files
    async deleteFiles(req, res) {
        const data = await resolvePost(req);
        const { uploadpath } = data;
        UPLOAD_DIR_NEW = UPLOAD_DIR(uploadpath);
        await fse.remove(path.resolve(UPLOAD_DIR_NEW));
        res.end(JSON.stringify({ code: 0, message: "file delete success" }));
    }

    // 处理切片
    // process chunk
    async handleFormData(req, res) {
        const multipart = new multiparty.Form();

        multipart.parse(req, async (err, fields, files) => {
            if (err) {
                console.error(err);
                res.status = 500;
                res.end("process file chunk failed");
                return;
            }
            const [chunk] = files.chunk;
            const [hash] = fields.hash;
            const [fileHash] = fields.fileHash;
            const [filename] = fields.filename;
            const [uploadPath] = fields.uploadpath;
            UPLOAD_DIR_NEW = UPLOAD_DIR(uploadPath);
            const filePath = path.resolve(UPLOAD_DIR_NEW, `${fileHash}${extractExt(filename)}`);
            const chunkDir = getChunkDir(fileHash);
            const chunkPath = path.resolve(chunkDir, hash);

            // 文件存在直接返回
            // return if file is exists
            if (fse.existsSync(filePath)) {
                res.end("file exist");
                return;
            }

            // 切片存在直接返回
            // return if chunk is exists
            if (fse.existsSync(chunkPath)) {
                res.end("chunk exist");
                return;
            }

            // 切片目录不存在，创建切片目录
            // if chunk directory is not exist, create it
            if (!fse.existsSync(chunkDir)) {
                await fse.mkdirs(chunkDir);
            }

            // fs-extra 的 rename 方法 windows 平台会有权限问题
            // use fs.move instead of fs.rename
            // https://github.com/meteor/meteor/issues/7852#issuecomment-255767835
            await fse.move(chunk.path, path.resolve(chunkDir, hash));
            res.end("received file chunk");
        });
    }

    // 验证是否已上传/已上传切片下标
    // Verify if a chunk is uploaded/uploaded
    async handleVerifyUpload(req, res) {
        const data = await resolvePost(req);
        const { fileHash, filename, uploadpath } = data;
        const ext = extractExt(filename);
        UPLOAD_DIR_NEW = UPLOAD_DIR(uploadpath);
        const filePath = path.resolve(UPLOAD_DIR_NEW, `${fileHash}${ext}`);
        console.log('handleVerifyUpload.001')
        if (fse.existsSync(filePath)) {
            console.log('handleVerifyUpload.002')
            res.end(JSON.stringify({ shouldUpload: false }));
        } else {
            console.log('handleVerifyUpload.003')
            const data = JSON.stringify({ shouldUpload: true, uploadedList: await createUploadedList(fileHash) });
            console.log('handleVerifyUpload.data:',data);
            res.end(data);
        }
    }
};
