const electron = require('electron');
const url = require('url');
const path = require('path');
const pie = require("puppeteer-in-electron");
const puppeteer = require("puppeteer-core");

// サーバー立ち上げ
var nodeStatic = require('node-static');
var file = new nodeStatic.Server(path.join(__dirname, 'commentView/'));

const server = require('http').createServer(function (request, response) {
  request.addListener('end', function () {
    file.serve(request, response);
  }).resume();
}).listen(7170); //ポートは空いていそうなところで。

const io = require('socket.io')(server);


const winWidth = 500;
const winHeight = 500;
// electron初期化
class App {
  constructor(electron) {
    this.app = electron.app;
    this.mainView;
    this.commentView;
    this.app.on('window-all-closed', function () {
      if (process.platform !== 'darwin') {
        this.app.quit();
      };
    });
    this.app.addListener('ready', function () {
      this.mainView = new electron.BrowserWindow({
        width: winWidth,
        height: winHeight,
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false,
        }
      });
      this.mainView.loadURL('file://' + __dirname + '/mainView/index.html')


      // commentView
      const size = electron.screen.getPrimaryDisplay().size
      this.commentView = new electron.BrowserWindow({
        width: size.width,
        height: size.height,
        transparent: true,
        frame: false,
        resizable: false,
        alwaysOnTop: true,
      });
      this.commentView.loadURL('http://localhost:7170/');
      this.commentView.setIgnoreMouseEvents(true);
    });

    // this.commentView.on('closed', function () {
    //   app.quit();
    // });
    // this.commentView.webContents.openDevTools()
  }
}

const commentApp = new App(electron);
const main = async () => {
  await pie.initialize(electron.app);
  const browser = await pie.connect(electron.app, puppeteer);


  // let view = new electron.BrowserView({
  //   webPreferences: {
  //     nodeIntegration: false
  //   }
  // })
  // commentApp.app.addListener('ready', async function () {
    // commentApp.mainView.setBrowserView(view);
    // view.setBounds({
    //   x: winWidth / 2,
    //   y: 0,
    //   width: winWidth / 2,
    //   height: winHeight
    // })
    const url = "https://twitcasting.tv/black_ape/windowcomment?embedded=1&auth_user_id=black_ape&auth_key=mu89hz0sbz";
    // await view.webContents.loadURL(url)
    const window = new electron.BrowserWindow({
        width: 0,
        height: 0,
        transparent: true,
        frame: false,
        resizable: false,
    });
    await window.loadURL(url);

    // const page = await pie.getPage(browser, view);
    const page = await pie.getPage(browser, window);
    // window.destroy();

    let adddom = await page.evaluate(() => {
      const target = document.querySelector('.tw-comment-list-view__scroller div')
      const observer = new MutationObserver(records => {
        const comment = records[0].addedNodes[0];
        const nameEle = comment.querySelector('.tw-comment-item-name')
        const commentEle = comment.querySelector('.tw-comment-item-comment')
        const commentUserId = comment.querySelector('.tw-comment-item-screen-id')
        const itemImage = comment.querySelector('.tw-comment-item-attachment img')
        // const itemComment = comment.querySelector('.tw-comment-item-comment')
        const resObj = {
          userId: commentUserId.innerText,
          name: nameEle.innerText,
          dataType: comment.getAttribute('data-type'),
          comment: String(commentEle.innerHTML.replace(/&/g, "&amp;")
            .replace(/"/g, "&quot;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")),
          date: commentEle.getAttribute('title'),
          itemImage: itemImage ? itemImage.getAttribute('src') : ''
          // itemImage: String(itemImage.innerHTML.replace(/&/g, "&amp;")
          // .replace(/"/g, "&quot;")
          // .replace(/</g, "&lt;")
          // .replace(/>/g, "&gt;")),
        }
        console.log(JSON.stringify(resObj))
        // console.log(comment.querySelector('.tw-comment-item'))
        // console.log(comment)
      })
      observer.observe(target, {
        childList: true
      })
    })
    page.on('console', async (msg) => {
      // console.log(msg._text)
      // console.log(mainWindow.webContents)
      // mainWindow.webContents.send('ping', 'whoooooooh!')
      io.emit('comment', msg._text);
    })
  // })

};

main();