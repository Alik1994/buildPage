/*
ЗАДАЧА:
В файле index.js директории 06-build-page напишите скрипт который:
  1. Создаёт папку project-dist.
  2. Заменяет шаблонные теги в файле template.html с названиями файлов из папки components (пример:{{section}}) на содержимое одноимённых компонентов и сохраняет результат в project-dist/index.html.
  3. Собирает в единый файл стили из папки styles и помещает их в файл project-dist/style.css.
  4. Копирует папку assets в project-dist/assets
*/

const path = require("path");
const fs = require("fs");

//Перечень ошибок
const errObj = {
  folderErr(folder) {
    return new Error(`Ошибка чтения папки ${folder}`);
  },
  fileErr(file) {
    return new Error(`Ошибка чтения файла ${file}`);
  },
  rewriteErr(file) {
    return new Error(`Ошибка перезаписи файла ${file}`);
  },
  createErr(file) {
    return new Error(`Ошибка создания ${file}`);
  },
  deleteErr(file) {
    return new Error(`Ошибка удаления ${file}`);
  },
  copyErr(file) {
    return new Error(`Ошибка копирования ${file}`);
  },
};

//Функция создания папки для сборки
function makeDist() {
  fs.mkdir(path.join(__dirname, "project-dist"), (err) => {
    if (err) throw err;
  });
}

//-----СОБИРАЕМ HTML-----
//Функция копирования template.html в index.html
function createIndexHTML() {
  const outputHTML = fs.createWriteStream(
    path.join(__dirname, "project-dist", "index.html")
  );
  const inputHTML = fs.createReadStream(
    path.join(__dirname, "template.html"),
    "utf-8"
  );

  inputHTML.on("data", (chunk) => {
    outputHTML.write(chunk);
  });

  //Как только файл создался, запускаем функцию сборки компонентов
  inputHTML.on("end", mergeComponents);
}

//Функция сборки компонентов
function mergeComponents() {
  //Читаем содержание папки components
  async function readFolder() {
    //Расширение файла
    const extHTML = ".html";

    //Создаем промис чтения папки
    let readDirPromise = new Promise(function (resolve, reject) {
      fs.readdir(path.join(__dirname, "components"), (err, files) => {
        //Если ошибка, то показываем
        if (err) reject(errObj.folderErr("components"));

        //Массив для хранения названий файлов
        const filesList = [];

        //Перебор файлов
        for (const file of files) {
          //Отбор файлов с форматом .html
          if (path.extname(file) === extHTML)
            filesList.push(path.basename(file, path.extname(file)));
        }
        resolve(filesList);
      });
    });

    //Присваиваем переменной результат выполнения промиса
    const files = await readDirPromise;

    //Читаем файлы из папки components
    for (const file of files) {
      //Создаем промис чтения файла
      const data = new Promise(function (resolve, reject) {
        fs.readFile(
          path.join(__dirname, "components", `${file + extHTML}`),
          "utf8",
          (err, data) => {
            if (err) reject(errObj.fileErr(`${file}`));
            resolve(data);
          }
        );
      });

      let code = await data;

      //Создаем промис замены данных
      let changeDataPromise = new Promise(function (resolve, reject) {
        fs.readFile(
          path.join(__dirname, "project-dist", "index.html"),
          "utf8",
          (err, data) => {
            if (err) reject(errObj.fileErr("index.html"));

            let tag = "{{" + file + "}}";
            let newData = data.replace(tag, code);

            resolve(newData);
          }
        );
      });

      //Ждем пока выполниться промис и присваиваем полученные данные переменной
      let replace = await changeDataPromise;

      //Промис перезаписи файла index.html
      let rewritePromise = new Promise(function (resolve, reject) {
        fs.writeFile(
          path.join(__dirname, "project-dist", "index.html"),
          replace,
          "utf8",
          (err) => {
            if (err) reject(errObj.rewriteErr("index.html"));
            resolve("Done");
          }
        );
      });

      //Ждем, пока выполниться промис
      await rewritePromise;
    }
  }
  readFolder();
}

//Сборка html
function buildHTML() {
  //Проверка наличия template.html
  fs.access(path.join(__dirname, "template.html"), fs.constants.F_OK, (err) => {
    if (err) {
      console.log("Файл template.html не найден");
      process.exit();
    }
  });

  createIndexHTML();
}
//-----СБОРКА СТИЛЕЙ-----
function mergeStyles() {
  const output = fs.createWriteStream(
    path.join(__dirname, "project-dist", "style.css")
  );

  fs.readdir(path.join(__dirname, "styles"), (err, files) => {
    if (err) throw err;

    for (const file of files) {
      if (path.extname(file) === ".css") {
        let input = fs.createReadStream(
          path.join(__dirname, "styles", `${file}`)
        );
        input.pipe(output);
      }
    }
  });
}

//-----КОПИРОВАНИЕ ПАПКИ ASSETS-----

//Создание папки project-dist/assets
function copyAssets() {
  /*
  Проверяем наличие папки project-dist/assets:
  1. Папка существует -> удаляем ее, а затем создаем заново
  2. Папки нет -> делаем проброс ошибки и создаем ее
  */

  //Промис проверки доступа к папке
  const accessPromise = new Promise(function (resolve, reject) {
    fs.access(
      path.join(__dirname, "project-dist", "assets"),
      fs.constants.F_OK,
      (err) => {
        if (err) {
          reject(false);
        }
        resolve(true);
      }
    );
  });

  accessPromise
    .then(
      //Если папка есть, удаляем ее
      (result) => {
        console.log(result);
        return new Promise(function (resolve, reject) {
          /*
          Метод fs.rm не может удалить папку, содержащую файлы.
          Для этого необходимо добавить параметр {recursive: true} для рекурсивного обхода
          */
          fs.rm(
            path.join(__dirname, "project-dist", "assets"),
            {
              recursive: true,
            },
            (err) => {
              if (err) reject(errObj.deleteErr("assets"));
              resolve("Assets was rewrite");
            }
          );
        });
      },

      //Если ее нет, делаем проброс ошибки
      (err) => {
        if (err) throw err;
      }
    )
    .then((result) => {
      console.log(result);
      return new Promise(function (resolve, reject) {
        fs.mkdir(path.join(__dirname, "project-dist", "assets"), (err) => {
          if (err) reject(errObj.createErr("assets"));
          resolve("Assets was created");
        });
      });
    })
    .then(() => {
      return copyFiles();
    });
}

//Функция копирования assets в project-dist/assets
function copyFiles() {
  async function getFiles(dir, dirCopy) {
    //Читаем содержимое папки
    const readPromise = new Promise(function (resolve, reject) {
      fs.readdir(dir, (err, files) => {
        if (err) reject(errObj.folderErr(`${dir}`));

        let filesArr = [];

        for (const file of files) filesArr.push(file);
        resolve(filesArr);
      });
    });

    const subfiles = await readPromise;

    for (const file of subfiles) {
      //Получаем путь к файлу
      let res = path.resolve(dir, file);

      //Путь к файлу для копирования
      let resCopy = path.resolve(dirCopy, file);

      //Проверка, является ли файл папкой
      let checkPromise = new Promise(function (resolve, reject) {
        fs.stat(res, (err, stats) => {
          if (err) reject(errObj.fileErr(`${file}`));
          resolve(stats.isDirectory());
        });
      });

      let isDirectory = await checkPromise;

      if (isDirectory) {
        let createPromise = () =>
          new Promise(function (resolve, reject) {
            fs.mkdir(`${resCopy}`, (err) => {
              if (err) reject(errObj.createErr(`${file}`));
              resolve("File was created");
            });
          });

        await createPromise();

        //Рекурсивно вызываем функцию с новыми параметрами
        getFiles(res, resCopy);
      } else {
        let copyPromise = () =>
          new Promise(function (resolve, reject) {
            fs.copyFile(res, resCopy, (err) => {
              if (err) reject(errObj.copyErr(`${file}`));
              resolve("File was copied");
            });
          });

        await copyPromise();
      }
    }
  }
  getFiles(
    path.join(__dirname, "assets"),
    path.join(__dirname, "project-dist", "assets")
  );
}

//-----СБОРКА ПРОЕКТА-----

//Функция сборки проекта
function buildProject() {
  //Промис проверки наличия файла
  const accessDistProm = new Promise(function (resolve, reject) {
    fs.access(path.join(__dirname, "project-dist"), (err) => {
      if (err) {
        reject(false);
      }
      resolve("project-dist is created");
    });
  });

  accessDistProm
    .then(
      function (result) {
        return result;
      },
      function (err) {
        console.log(err.message);
        return makeDist();
      }
    )
    .then(() => buildHTML())
    .then(() => mergeStyles())
    .then(() => copyAssets());
}

buildProject();
