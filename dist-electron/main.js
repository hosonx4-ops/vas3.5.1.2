"use strict";
const require$$1$3 = require("electron");
const path = require("path");
const fs$1 = require("fs");
const require$$0 = require("constants");
const require$$0$1 = require("stream");
const require$$1 = require("util");
const require$$5 = require("assert");
const require$$0$4 = require("child_process");
const require$$0$2 = require("events");
const require$$0$3 = require("crypto");
const require$$1$1 = require("tty");
const require$$2 = require("os");
const require$$4 = require("url");
const require$$1$2 = require("string_decoder");
const require$$14 = require("zlib");
const require$$4$1 = require("http");
var commonjsGlobal = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : {};
function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}
var main$1 = {};
var fs = {};
var universalify = {};
var hasRequiredUniversalify;
function requireUniversalify() {
  if (hasRequiredUniversalify) return universalify;
  hasRequiredUniversalify = 1;
  universalify.fromCallback = function(fn) {
    return Object.defineProperty(function(...args) {
      if (typeof args[args.length - 1] === "function") fn.apply(this, args);
      else {
        return new Promise((resolve, reject) => {
          args.push((err, res) => err != null ? reject(err) : resolve(res));
          fn.apply(this, args);
        });
      }
    }, "name", { value: fn.name });
  };
  universalify.fromPromise = function(fn) {
    return Object.defineProperty(function(...args) {
      const cb = args[args.length - 1];
      if (typeof cb !== "function") return fn.apply(this, args);
      else {
        args.pop();
        fn.apply(this, args).then((r) => cb(null, r), cb);
      }
    }, "name", { value: fn.name });
  };
  return universalify;
}
var polyfills;
var hasRequiredPolyfills;
function requirePolyfills() {
  if (hasRequiredPolyfills) return polyfills;
  hasRequiredPolyfills = 1;
  var constants2 = require$$0;
  var origCwd = process.cwd;
  var cwd = null;
  var platform = process.env.GRACEFUL_FS_PLATFORM || process.platform;
  process.cwd = function() {
    if (!cwd)
      cwd = origCwd.call(process);
    return cwd;
  };
  try {
    process.cwd();
  } catch (er) {
  }
  if (typeof process.chdir === "function") {
    var chdir = process.chdir;
    process.chdir = function(d) {
      cwd = null;
      chdir.call(process, d);
    };
    if (Object.setPrototypeOf) Object.setPrototypeOf(process.chdir, chdir);
  }
  polyfills = patch;
  function patch(fs2) {
    if (constants2.hasOwnProperty("O_SYMLINK") && process.version.match(/^v0\.6\.[0-2]|^v0\.5\./)) {
      patchLchmod(fs2);
    }
    if (!fs2.lutimes) {
      patchLutimes(fs2);
    }
    fs2.chown = chownFix(fs2.chown);
    fs2.fchown = chownFix(fs2.fchown);
    fs2.lchown = chownFix(fs2.lchown);
    fs2.chmod = chmodFix(fs2.chmod);
    fs2.fchmod = chmodFix(fs2.fchmod);
    fs2.lchmod = chmodFix(fs2.lchmod);
    fs2.chownSync = chownFixSync(fs2.chownSync);
    fs2.fchownSync = chownFixSync(fs2.fchownSync);
    fs2.lchownSync = chownFixSync(fs2.lchownSync);
    fs2.chmodSync = chmodFixSync(fs2.chmodSync);
    fs2.fchmodSync = chmodFixSync(fs2.fchmodSync);
    fs2.lchmodSync = chmodFixSync(fs2.lchmodSync);
    fs2.stat = statFix(fs2.stat);
    fs2.fstat = statFix(fs2.fstat);
    fs2.lstat = statFix(fs2.lstat);
    fs2.statSync = statFixSync(fs2.statSync);
    fs2.fstatSync = statFixSync(fs2.fstatSync);
    fs2.lstatSync = statFixSync(fs2.lstatSync);
    if (fs2.chmod && !fs2.lchmod) {
      fs2.lchmod = function(path2, mode2, cb) {
        if (cb) process.nextTick(cb);
      };
      fs2.lchmodSync = function() {
      };
    }
    if (fs2.chown && !fs2.lchown) {
      fs2.lchown = function(path2, uid, gid, cb) {
        if (cb) process.nextTick(cb);
      };
      fs2.lchownSync = function() {
      };
    }
    if (platform === "win32") {
      fs2.rename = typeof fs2.rename !== "function" ? fs2.rename : (function(fs$rename) {
        function rename(from, to, cb) {
          var start = Date.now();
          var backoff = 0;
          fs$rename(from, to, function CB(er) {
            if (er && (er.code === "EACCES" || er.code === "EPERM" || er.code === "EBUSY") && Date.now() - start < 6e4) {
              setTimeout(function() {
                fs2.stat(to, function(stater, st) {
                  if (stater && stater.code === "ENOENT")
                    fs$rename(from, to, CB);
                  else
                    cb(er);
                });
              }, backoff);
              if (backoff < 100)
                backoff += 10;
              return;
            }
            if (cb) cb(er);
          });
        }
        if (Object.setPrototypeOf) Object.setPrototypeOf(rename, fs$rename);
        return rename;
      })(fs2.rename);
    }
    fs2.read = typeof fs2.read !== "function" ? fs2.read : (function(fs$read) {
      function read(fd, buffer, offset, length, position, callback_) {
        var callback;
        if (callback_ && typeof callback_ === "function") {
          var eagCounter = 0;
          callback = function(er, _, __) {
            if (er && er.code === "EAGAIN" && eagCounter < 10) {
              eagCounter++;
              return fs$read.call(fs2, fd, buffer, offset, length, position, callback);
            }
            callback_.apply(this, arguments);
          };
        }
        return fs$read.call(fs2, fd, buffer, offset, length, position, callback);
      }
      if (Object.setPrototypeOf) Object.setPrototypeOf(read, fs$read);
      return read;
    })(fs2.read);
    fs2.readSync = typeof fs2.readSync !== "function" ? fs2.readSync : /* @__PURE__ */ (function(fs$readSync) {
      return function(fd, buffer, offset, length, position) {
        var eagCounter = 0;
        while (true) {
          try {
            return fs$readSync.call(fs2, fd, buffer, offset, length, position);
          } catch (er) {
            if (er.code === "EAGAIN" && eagCounter < 10) {
              eagCounter++;
              continue;
            }
            throw er;
          }
        }
      };
    })(fs2.readSync);
    function patchLchmod(fs22) {
      fs22.lchmod = function(path2, mode2, callback) {
        fs22.open(
          path2,
          constants2.O_WRONLY | constants2.O_SYMLINK,
          mode2,
          function(err, fd) {
            if (err) {
              if (callback) callback(err);
              return;
            }
            fs22.fchmod(fd, mode2, function(err2) {
              fs22.close(fd, function(err22) {
                if (callback) callback(err2 || err22);
              });
            });
          }
        );
      };
      fs22.lchmodSync = function(path2, mode2) {
        var fd = fs22.openSync(path2, constants2.O_WRONLY | constants2.O_SYMLINK, mode2);
        var threw = true;
        var ret;
        try {
          ret = fs22.fchmodSync(fd, mode2);
          threw = false;
        } finally {
          if (threw) {
            try {
              fs22.closeSync(fd);
            } catch (er) {
            }
          } else {
            fs22.closeSync(fd);
          }
        }
        return ret;
      };
    }
    function patchLutimes(fs22) {
      if (constants2.hasOwnProperty("O_SYMLINK") && fs22.futimes) {
        fs22.lutimes = function(path2, at, mt, cb) {
          fs22.open(path2, constants2.O_SYMLINK, function(er, fd) {
            if (er) {
              if (cb) cb(er);
              return;
            }
            fs22.futimes(fd, at, mt, function(er2) {
              fs22.close(fd, function(er22) {
                if (cb) cb(er2 || er22);
              });
            });
          });
        };
        fs22.lutimesSync = function(path2, at, mt) {
          var fd = fs22.openSync(path2, constants2.O_SYMLINK);
          var ret;
          var threw = true;
          try {
            ret = fs22.futimesSync(fd, at, mt);
            threw = false;
          } finally {
            if (threw) {
              try {
                fs22.closeSync(fd);
              } catch (er) {
              }
            } else {
              fs22.closeSync(fd);
            }
          }
          return ret;
        };
      } else if (fs22.futimes) {
        fs22.lutimes = function(_a, _b, _c, cb) {
          if (cb) process.nextTick(cb);
        };
        fs22.lutimesSync = function() {
        };
      }
    }
    function chmodFix(orig) {
      if (!orig) return orig;
      return function(target, mode2, cb) {
        return orig.call(fs2, target, mode2, function(er) {
          if (chownErOk(er)) er = null;
          if (cb) cb.apply(this, arguments);
        });
      };
    }
    function chmodFixSync(orig) {
      if (!orig) return orig;
      return function(target, mode2) {
        try {
          return orig.call(fs2, target, mode2);
        } catch (er) {
          if (!chownErOk(er)) throw er;
        }
      };
    }
    function chownFix(orig) {
      if (!orig) return orig;
      return function(target, uid, gid, cb) {
        return orig.call(fs2, target, uid, gid, function(er) {
          if (chownErOk(er)) er = null;
          if (cb) cb.apply(this, arguments);
        });
      };
    }
    function chownFixSync(orig) {
      if (!orig) return orig;
      return function(target, uid, gid) {
        try {
          return orig.call(fs2, target, uid, gid);
        } catch (er) {
          if (!chownErOk(er)) throw er;
        }
      };
    }
    function statFix(orig) {
      if (!orig) return orig;
      return function(target, options, cb) {
        if (typeof options === "function") {
          cb = options;
          options = null;
        }
        function callback(er, stats) {
          if (stats) {
            if (stats.uid < 0) stats.uid += 4294967296;
            if (stats.gid < 0) stats.gid += 4294967296;
          }
          if (cb) cb.apply(this, arguments);
        }
        return options ? orig.call(fs2, target, options, callback) : orig.call(fs2, target, callback);
      };
    }
    function statFixSync(orig) {
      if (!orig) return orig;
      return function(target, options) {
        var stats = options ? orig.call(fs2, target, options) : orig.call(fs2, target);
        if (stats) {
          if (stats.uid < 0) stats.uid += 4294967296;
          if (stats.gid < 0) stats.gid += 4294967296;
        }
        return stats;
      };
    }
    function chownErOk(er) {
      if (!er)
        return true;
      if (er.code === "ENOSYS")
        return true;
      var nonroot = !process.getuid || process.getuid() !== 0;
      if (nonroot) {
        if (er.code === "EINVAL" || er.code === "EPERM")
          return true;
      }
      return false;
    }
  }
  return polyfills;
}
var legacyStreams;
var hasRequiredLegacyStreams;
function requireLegacyStreams() {
  if (hasRequiredLegacyStreams) return legacyStreams;
  hasRequiredLegacyStreams = 1;
  var Stream = require$$0$1.Stream;
  legacyStreams = legacy;
  function legacy(fs2) {
    return {
      ReadStream,
      WriteStream
    };
    function ReadStream(path2, options) {
      if (!(this instanceof ReadStream)) return new ReadStream(path2, options);
      Stream.call(this);
      var self2 = this;
      this.path = path2;
      this.fd = null;
      this.readable = true;
      this.paused = false;
      this.flags = "r";
      this.mode = 438;
      this.bufferSize = 64 * 1024;
      options = options || {};
      var keys = Object.keys(options);
      for (var index = 0, length = keys.length; index < length; index++) {
        var key = keys[index];
        this[key] = options[key];
      }
      if (this.encoding) this.setEncoding(this.encoding);
      if (this.start !== void 0) {
        if ("number" !== typeof this.start) {
          throw TypeError("start must be a Number");
        }
        if (this.end === void 0) {
          this.end = Infinity;
        } else if ("number" !== typeof this.end) {
          throw TypeError("end must be a Number");
        }
        if (this.start > this.end) {
          throw new Error("start must be <= end");
        }
        this.pos = this.start;
      }
      if (this.fd !== null) {
        process.nextTick(function() {
          self2._read();
        });
        return;
      }
      fs2.open(this.path, this.flags, this.mode, function(err, fd) {
        if (err) {
          self2.emit("error", err);
          self2.readable = false;
          return;
        }
        self2.fd = fd;
        self2.emit("open", fd);
        self2._read();
      });
    }
    function WriteStream(path2, options) {
      if (!(this instanceof WriteStream)) return new WriteStream(path2, options);
      Stream.call(this);
      this.path = path2;
      this.fd = null;
      this.writable = true;
      this.flags = "w";
      this.encoding = "binary";
      this.mode = 438;
      this.bytesWritten = 0;
      options = options || {};
      var keys = Object.keys(options);
      for (var index = 0, length = keys.length; index < length; index++) {
        var key = keys[index];
        this[key] = options[key];
      }
      if (this.start !== void 0) {
        if ("number" !== typeof this.start) {
          throw TypeError("start must be a Number");
        }
        if (this.start < 0) {
          throw new Error("start must be >= zero");
        }
        this.pos = this.start;
      }
      this.busy = false;
      this._queue = [];
      if (this.fd === null) {
        this._open = fs2.open;
        this._queue.push([this._open, this.path, this.flags, this.mode, void 0]);
        this.flush();
      }
    }
  }
  return legacyStreams;
}
var clone_1;
var hasRequiredClone;
function requireClone() {
  if (hasRequiredClone) return clone_1;
  hasRequiredClone = 1;
  clone_1 = clone;
  var getPrototypeOf = Object.getPrototypeOf || function(obj) {
    return obj.__proto__;
  };
  function clone(obj) {
    if (obj === null || typeof obj !== "object")
      return obj;
    if (obj instanceof Object)
      var copy2 = { __proto__: getPrototypeOf(obj) };
    else
      var copy2 = /* @__PURE__ */ Object.create(null);
    Object.getOwnPropertyNames(obj).forEach(function(key) {
      Object.defineProperty(copy2, key, Object.getOwnPropertyDescriptor(obj, key));
    });
    return copy2;
  }
  return clone_1;
}
var gracefulFs;
var hasRequiredGracefulFs;
function requireGracefulFs() {
  if (hasRequiredGracefulFs) return gracefulFs;
  hasRequiredGracefulFs = 1;
  var fs2 = fs$1;
  var polyfills2 = requirePolyfills();
  var legacy = requireLegacyStreams();
  var clone = requireClone();
  var util2 = require$$1;
  var gracefulQueue;
  var previousSymbol;
  if (typeof Symbol === "function" && typeof Symbol.for === "function") {
    gracefulQueue = Symbol.for("graceful-fs.queue");
    previousSymbol = Symbol.for("graceful-fs.previous");
  } else {
    gracefulQueue = "___graceful-fs.queue";
    previousSymbol = "___graceful-fs.previous";
  }
  function noop() {
  }
  function publishQueue(context, queue2) {
    Object.defineProperty(context, gracefulQueue, {
      get: function() {
        return queue2;
      }
    });
  }
  var debug = noop;
  if (util2.debuglog)
    debug = util2.debuglog("gfs4");
  else if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || ""))
    debug = function() {
      var m = util2.format.apply(util2, arguments);
      m = "GFS4: " + m.split(/\n/).join("\nGFS4: ");
      console.error(m);
    };
  if (!fs2[gracefulQueue]) {
    var queue = commonjsGlobal[gracefulQueue] || [];
    publishQueue(fs2, queue);
    fs2.close = (function(fs$close) {
      function close(fd, cb) {
        return fs$close.call(fs2, fd, function(err) {
          if (!err) {
            resetQueue();
          }
          if (typeof cb === "function")
            cb.apply(this, arguments);
        });
      }
      Object.defineProperty(close, previousSymbol, {
        value: fs$close
      });
      return close;
    })(fs2.close);
    fs2.closeSync = (function(fs$closeSync) {
      function closeSync(fd) {
        fs$closeSync.apply(fs2, arguments);
        resetQueue();
      }
      Object.defineProperty(closeSync, previousSymbol, {
        value: fs$closeSync
      });
      return closeSync;
    })(fs2.closeSync);
    if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || "")) {
      process.on("exit", function() {
        debug(fs2[gracefulQueue]);
        require$$5.equal(fs2[gracefulQueue].length, 0);
      });
    }
  }
  if (!commonjsGlobal[gracefulQueue]) {
    publishQueue(commonjsGlobal, fs2[gracefulQueue]);
  }
  gracefulFs = patch(clone(fs2));
  if (process.env.TEST_GRACEFUL_FS_GLOBAL_PATCH && !fs2.__patched) {
    gracefulFs = patch(fs2);
    fs2.__patched = true;
  }
  function patch(fs22) {
    polyfills2(fs22);
    fs22.gracefulify = patch;
    fs22.createReadStream = createReadStream;
    fs22.createWriteStream = createWriteStream;
    var fs$readFile = fs22.readFile;
    fs22.readFile = readFile;
    function readFile(path2, options, cb) {
      if (typeof options === "function")
        cb = options, options = null;
      return go$readFile(path2, options, cb);
      function go$readFile(path22, options2, cb2, startTime) {
        return fs$readFile(path22, options2, function(err) {
          if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
            enqueue([go$readFile, [path22, options2, cb2], err, startTime || Date.now(), Date.now()]);
          else {
            if (typeof cb2 === "function")
              cb2.apply(this, arguments);
          }
        });
      }
    }
    var fs$writeFile = fs22.writeFile;
    fs22.writeFile = writeFile;
    function writeFile(path2, data, options, cb) {
      if (typeof options === "function")
        cb = options, options = null;
      return go$writeFile(path2, data, options, cb);
      function go$writeFile(path22, data2, options2, cb2, startTime) {
        return fs$writeFile(path22, data2, options2, function(err) {
          if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
            enqueue([go$writeFile, [path22, data2, options2, cb2], err, startTime || Date.now(), Date.now()]);
          else {
            if (typeof cb2 === "function")
              cb2.apply(this, arguments);
          }
        });
      }
    }
    var fs$appendFile = fs22.appendFile;
    if (fs$appendFile)
      fs22.appendFile = appendFile;
    function appendFile(path2, data, options, cb) {
      if (typeof options === "function")
        cb = options, options = null;
      return go$appendFile(path2, data, options, cb);
      function go$appendFile(path22, data2, options2, cb2, startTime) {
        return fs$appendFile(path22, data2, options2, function(err) {
          if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
            enqueue([go$appendFile, [path22, data2, options2, cb2], err, startTime || Date.now(), Date.now()]);
          else {
            if (typeof cb2 === "function")
              cb2.apply(this, arguments);
          }
        });
      }
    }
    var fs$copyFile = fs22.copyFile;
    if (fs$copyFile)
      fs22.copyFile = copyFile;
    function copyFile(src2, dest, flags, cb) {
      if (typeof flags === "function") {
        cb = flags;
        flags = 0;
      }
      return go$copyFile(src2, dest, flags, cb);
      function go$copyFile(src22, dest2, flags2, cb2, startTime) {
        return fs$copyFile(src22, dest2, flags2, function(err) {
          if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
            enqueue([go$copyFile, [src22, dest2, flags2, cb2], err, startTime || Date.now(), Date.now()]);
          else {
            if (typeof cb2 === "function")
              cb2.apply(this, arguments);
          }
        });
      }
    }
    var fs$readdir = fs22.readdir;
    fs22.readdir = readdir;
    var noReaddirOptionVersions = /^v[0-5]\./;
    function readdir(path2, options, cb) {
      if (typeof options === "function")
        cb = options, options = null;
      var go$readdir = noReaddirOptionVersions.test(process.version) ? function go$readdir2(path22, options2, cb2, startTime) {
        return fs$readdir(path22, fs$readdirCallback(
          path22,
          options2,
          cb2,
          startTime
        ));
      } : function go$readdir2(path22, options2, cb2, startTime) {
        return fs$readdir(path22, options2, fs$readdirCallback(
          path22,
          options2,
          cb2,
          startTime
        ));
      };
      return go$readdir(path2, options, cb);
      function fs$readdirCallback(path22, options2, cb2, startTime) {
        return function(err, files) {
          if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
            enqueue([
              go$readdir,
              [path22, options2, cb2],
              err,
              startTime || Date.now(),
              Date.now()
            ]);
          else {
            if (files && files.sort)
              files.sort();
            if (typeof cb2 === "function")
              cb2.call(this, err, files);
          }
        };
      }
    }
    if (process.version.substr(0, 4) === "v0.8") {
      var legStreams = legacy(fs22);
      ReadStream = legStreams.ReadStream;
      WriteStream = legStreams.WriteStream;
    }
    var fs$ReadStream = fs22.ReadStream;
    if (fs$ReadStream) {
      ReadStream.prototype = Object.create(fs$ReadStream.prototype);
      ReadStream.prototype.open = ReadStream$open;
    }
    var fs$WriteStream = fs22.WriteStream;
    if (fs$WriteStream) {
      WriteStream.prototype = Object.create(fs$WriteStream.prototype);
      WriteStream.prototype.open = WriteStream$open;
    }
    Object.defineProperty(fs22, "ReadStream", {
      get: function() {
        return ReadStream;
      },
      set: function(val) {
        ReadStream = val;
      },
      enumerable: true,
      configurable: true
    });
    Object.defineProperty(fs22, "WriteStream", {
      get: function() {
        return WriteStream;
      },
      set: function(val) {
        WriteStream = val;
      },
      enumerable: true,
      configurable: true
    });
    var FileReadStream = ReadStream;
    Object.defineProperty(fs22, "FileReadStream", {
      get: function() {
        return FileReadStream;
      },
      set: function(val) {
        FileReadStream = val;
      },
      enumerable: true,
      configurable: true
    });
    var FileWriteStream = WriteStream;
    Object.defineProperty(fs22, "FileWriteStream", {
      get: function() {
        return FileWriteStream;
      },
      set: function(val) {
        FileWriteStream = val;
      },
      enumerable: true,
      configurable: true
    });
    function ReadStream(path2, options) {
      if (this instanceof ReadStream)
        return fs$ReadStream.apply(this, arguments), this;
      else
        return ReadStream.apply(Object.create(ReadStream.prototype), arguments);
    }
    function ReadStream$open() {
      var that = this;
      open(that.path, that.flags, that.mode, function(err, fd) {
        if (err) {
          if (that.autoClose)
            that.destroy();
          that.emit("error", err);
        } else {
          that.fd = fd;
          that.emit("open", fd);
          that.read();
        }
      });
    }
    function WriteStream(path2, options) {
      if (this instanceof WriteStream)
        return fs$WriteStream.apply(this, arguments), this;
      else
        return WriteStream.apply(Object.create(WriteStream.prototype), arguments);
    }
    function WriteStream$open() {
      var that = this;
      open(that.path, that.flags, that.mode, function(err, fd) {
        if (err) {
          that.destroy();
          that.emit("error", err);
        } else {
          that.fd = fd;
          that.emit("open", fd);
        }
      });
    }
    function createReadStream(path2, options) {
      return new fs22.ReadStream(path2, options);
    }
    function createWriteStream(path2, options) {
      return new fs22.WriteStream(path2, options);
    }
    var fs$open = fs22.open;
    fs22.open = open;
    function open(path2, flags, mode2, cb) {
      if (typeof mode2 === "function")
        cb = mode2, mode2 = null;
      return go$open(path2, flags, mode2, cb);
      function go$open(path22, flags2, mode22, cb2, startTime) {
        return fs$open(path22, flags2, mode22, function(err, fd) {
          if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
            enqueue([go$open, [path22, flags2, mode22, cb2], err, startTime || Date.now(), Date.now()]);
          else {
            if (typeof cb2 === "function")
              cb2.apply(this, arguments);
          }
        });
      }
    }
    return fs22;
  }
  function enqueue(elem) {
    debug("ENQUEUE", elem[0].name, elem[1]);
    fs2[gracefulQueue].push(elem);
    retry2();
  }
  var retryTimer;
  function resetQueue() {
    var now = Date.now();
    for (var i = 0; i < fs2[gracefulQueue].length; ++i) {
      if (fs2[gracefulQueue][i].length > 2) {
        fs2[gracefulQueue][i][3] = now;
        fs2[gracefulQueue][i][4] = now;
      }
    }
    retry2();
  }
  function retry2() {
    clearTimeout(retryTimer);
    retryTimer = void 0;
    if (fs2[gracefulQueue].length === 0)
      return;
    var elem = fs2[gracefulQueue].shift();
    var fn = elem[0];
    var args = elem[1];
    var err = elem[2];
    var startTime = elem[3];
    var lastTime = elem[4];
    if (startTime === void 0) {
      debug("RETRY", fn.name, args);
      fn.apply(null, args);
    } else if (Date.now() - startTime >= 6e4) {
      debug("TIMEOUT", fn.name, args);
      var cb = args.pop();
      if (typeof cb === "function")
        cb.call(null, err);
    } else {
      var sinceAttempt = Date.now() - lastTime;
      var sinceStart = Math.max(lastTime - startTime, 1);
      var desiredDelay = Math.min(sinceStart * 1.2, 100);
      if (sinceAttempt >= desiredDelay) {
        debug("RETRY", fn.name, args);
        fn.apply(null, args.concat([startTime]));
      } else {
        fs2[gracefulQueue].push(elem);
      }
    }
    if (retryTimer === void 0) {
      retryTimer = setTimeout(retry2, 0);
    }
  }
  return gracefulFs;
}
var hasRequiredFs;
function requireFs() {
  if (hasRequiredFs) return fs;
  hasRequiredFs = 1;
  (function(exports) {
    const u = requireUniversalify().fromCallback;
    const fs2 = requireGracefulFs();
    const api = [
      "access",
      "appendFile",
      "chmod",
      "chown",
      "close",
      "copyFile",
      "fchmod",
      "fchown",
      "fdatasync",
      "fstat",
      "fsync",
      "ftruncate",
      "futimes",
      "lchmod",
      "lchown",
      "link",
      "lstat",
      "mkdir",
      "mkdtemp",
      "open",
      "opendir",
      "readdir",
      "readFile",
      "readlink",
      "realpath",
      "rename",
      "rm",
      "rmdir",
      "stat",
      "symlink",
      "truncate",
      "unlink",
      "utimes",
      "writeFile"
    ].filter((key) => {
      return typeof fs2[key] === "function";
    });
    Object.assign(exports, fs2);
    api.forEach((method) => {
      exports[method] = u(fs2[method]);
    });
    exports.exists = function(filename, callback) {
      if (typeof callback === "function") {
        return fs2.exists(filename, callback);
      }
      return new Promise((resolve) => {
        return fs2.exists(filename, resolve);
      });
    };
    exports.read = function(fd, buffer, offset, length, position, callback) {
      if (typeof callback === "function") {
        return fs2.read(fd, buffer, offset, length, position, callback);
      }
      return new Promise((resolve, reject) => {
        fs2.read(fd, buffer, offset, length, position, (err, bytesRead, buffer2) => {
          if (err) return reject(err);
          resolve({ bytesRead, buffer: buffer2 });
        });
      });
    };
    exports.write = function(fd, buffer, ...args) {
      if (typeof args[args.length - 1] === "function") {
        return fs2.write(fd, buffer, ...args);
      }
      return new Promise((resolve, reject) => {
        fs2.write(fd, buffer, ...args, (err, bytesWritten, buffer2) => {
          if (err) return reject(err);
          resolve({ bytesWritten, buffer: buffer2 });
        });
      });
    };
    if (typeof fs2.writev === "function") {
      exports.writev = function(fd, buffers, ...args) {
        if (typeof args[args.length - 1] === "function") {
          return fs2.writev(fd, buffers, ...args);
        }
        return new Promise((resolve, reject) => {
          fs2.writev(fd, buffers, ...args, (err, bytesWritten, buffers2) => {
            if (err) return reject(err);
            resolve({ bytesWritten, buffers: buffers2 });
          });
        });
      };
    }
    if (typeof fs2.realpath.native === "function") {
      exports.realpath.native = u(fs2.realpath.native);
    } else {
      process.emitWarning(
        "fs.realpath.native is not a function. Is fs being monkey-patched?",
        "Warning",
        "fs-extra-WARN0003"
      );
    }
  })(fs);
  return fs;
}
var makeDir = {};
var utils$2 = {};
var hasRequiredUtils$2;
function requireUtils$2() {
  if (hasRequiredUtils$2) return utils$2;
  hasRequiredUtils$2 = 1;
  const path$1 = path;
  utils$2.checkPath = function checkPath(pth) {
    if (process.platform === "win32") {
      const pathHasInvalidWinCharacters = /[<>:"|?*]/.test(pth.replace(path$1.parse(pth).root, ""));
      if (pathHasInvalidWinCharacters) {
        const error2 = new Error(`Path contains invalid characters: ${pth}`);
        error2.code = "EINVAL";
        throw error2;
      }
    }
  };
  return utils$2;
}
var hasRequiredMakeDir;
function requireMakeDir() {
  if (hasRequiredMakeDir) return makeDir;
  hasRequiredMakeDir = 1;
  const fs2 = /* @__PURE__ */ requireFs();
  const { checkPath } = /* @__PURE__ */ requireUtils$2();
  const getMode = (options) => {
    const defaults = { mode: 511 };
    if (typeof options === "number") return options;
    return { ...defaults, ...options }.mode;
  };
  makeDir.makeDir = async (dir, options) => {
    checkPath(dir);
    return fs2.mkdir(dir, {
      mode: getMode(options),
      recursive: true
    });
  };
  makeDir.makeDirSync = (dir, options) => {
    checkPath(dir);
    return fs2.mkdirSync(dir, {
      mode: getMode(options),
      recursive: true
    });
  };
  return makeDir;
}
var mkdirs;
var hasRequiredMkdirs;
function requireMkdirs() {
  if (hasRequiredMkdirs) return mkdirs;
  hasRequiredMkdirs = 1;
  const u = requireUniversalify().fromPromise;
  const { makeDir: _makeDir, makeDirSync } = /* @__PURE__ */ requireMakeDir();
  const makeDir2 = u(_makeDir);
  mkdirs = {
    mkdirs: makeDir2,
    mkdirsSync: makeDirSync,
    // alias
    mkdirp: makeDir2,
    mkdirpSync: makeDirSync,
    ensureDir: makeDir2,
    ensureDirSync: makeDirSync
  };
  return mkdirs;
}
var pathExists_1;
var hasRequiredPathExists;
function requirePathExists() {
  if (hasRequiredPathExists) return pathExists_1;
  hasRequiredPathExists = 1;
  const u = requireUniversalify().fromPromise;
  const fs2 = /* @__PURE__ */ requireFs();
  function pathExists(path2) {
    return fs2.access(path2).then(() => true).catch(() => false);
  }
  pathExists_1 = {
    pathExists: u(pathExists),
    pathExistsSync: fs2.existsSync
  };
  return pathExists_1;
}
var utimes;
var hasRequiredUtimes;
function requireUtimes() {
  if (hasRequiredUtimes) return utimes;
  hasRequiredUtimes = 1;
  const fs2 = requireGracefulFs();
  function utimesMillis(path2, atime, mtime, callback) {
    fs2.open(path2, "r+", (err, fd) => {
      if (err) return callback(err);
      fs2.futimes(fd, atime, mtime, (futimesErr) => {
        fs2.close(fd, (closeErr) => {
          if (callback) callback(futimesErr || closeErr);
        });
      });
    });
  }
  function utimesMillisSync(path2, atime, mtime) {
    const fd = fs2.openSync(path2, "r+");
    fs2.futimesSync(fd, atime, mtime);
    return fs2.closeSync(fd);
  }
  utimes = {
    utimesMillis,
    utimesMillisSync
  };
  return utimes;
}
var stat;
var hasRequiredStat;
function requireStat() {
  if (hasRequiredStat) return stat;
  hasRequiredStat = 1;
  const fs2 = /* @__PURE__ */ requireFs();
  const path$1 = path;
  const util2 = require$$1;
  function getStats(src2, dest, opts) {
    const statFunc = opts.dereference ? (file2) => fs2.stat(file2, { bigint: true }) : (file2) => fs2.lstat(file2, { bigint: true });
    return Promise.all([
      statFunc(src2),
      statFunc(dest).catch((err) => {
        if (err.code === "ENOENT") return null;
        throw err;
      })
    ]).then(([srcStat, destStat]) => ({ srcStat, destStat }));
  }
  function getStatsSync(src2, dest, opts) {
    let destStat;
    const statFunc = opts.dereference ? (file2) => fs2.statSync(file2, { bigint: true }) : (file2) => fs2.lstatSync(file2, { bigint: true });
    const srcStat = statFunc(src2);
    try {
      destStat = statFunc(dest);
    } catch (err) {
      if (err.code === "ENOENT") return { srcStat, destStat: null };
      throw err;
    }
    return { srcStat, destStat };
  }
  function checkPaths(src2, dest, funcName, opts, cb) {
    util2.callbackify(getStats)(src2, dest, opts, (err, stats) => {
      if (err) return cb(err);
      const { srcStat, destStat } = stats;
      if (destStat) {
        if (areIdentical(srcStat, destStat)) {
          const srcBaseName = path$1.basename(src2);
          const destBaseName = path$1.basename(dest);
          if (funcName === "move" && srcBaseName !== destBaseName && srcBaseName.toLowerCase() === destBaseName.toLowerCase()) {
            return cb(null, { srcStat, destStat, isChangingCase: true });
          }
          return cb(new Error("Source and destination must not be the same."));
        }
        if (srcStat.isDirectory() && !destStat.isDirectory()) {
          return cb(new Error(`Cannot overwrite non-directory '${dest}' with directory '${src2}'.`));
        }
        if (!srcStat.isDirectory() && destStat.isDirectory()) {
          return cb(new Error(`Cannot overwrite directory '${dest}' with non-directory '${src2}'.`));
        }
      }
      if (srcStat.isDirectory() && isSrcSubdir(src2, dest)) {
        return cb(new Error(errMsg(src2, dest, funcName)));
      }
      return cb(null, { srcStat, destStat });
    });
  }
  function checkPathsSync(src2, dest, funcName, opts) {
    const { srcStat, destStat } = getStatsSync(src2, dest, opts);
    if (destStat) {
      if (areIdentical(srcStat, destStat)) {
        const srcBaseName = path$1.basename(src2);
        const destBaseName = path$1.basename(dest);
        if (funcName === "move" && srcBaseName !== destBaseName && srcBaseName.toLowerCase() === destBaseName.toLowerCase()) {
          return { srcStat, destStat, isChangingCase: true };
        }
        throw new Error("Source and destination must not be the same.");
      }
      if (srcStat.isDirectory() && !destStat.isDirectory()) {
        throw new Error(`Cannot overwrite non-directory '${dest}' with directory '${src2}'.`);
      }
      if (!srcStat.isDirectory() && destStat.isDirectory()) {
        throw new Error(`Cannot overwrite directory '${dest}' with non-directory '${src2}'.`);
      }
    }
    if (srcStat.isDirectory() && isSrcSubdir(src2, dest)) {
      throw new Error(errMsg(src2, dest, funcName));
    }
    return { srcStat, destStat };
  }
  function checkParentPaths(src2, srcStat, dest, funcName, cb) {
    const srcParent = path$1.resolve(path$1.dirname(src2));
    const destParent = path$1.resolve(path$1.dirname(dest));
    if (destParent === srcParent || destParent === path$1.parse(destParent).root) return cb();
    fs2.stat(destParent, { bigint: true }, (err, destStat) => {
      if (err) {
        if (err.code === "ENOENT") return cb();
        return cb(err);
      }
      if (areIdentical(srcStat, destStat)) {
        return cb(new Error(errMsg(src2, dest, funcName)));
      }
      return checkParentPaths(src2, srcStat, destParent, funcName, cb);
    });
  }
  function checkParentPathsSync(src2, srcStat, dest, funcName) {
    const srcParent = path$1.resolve(path$1.dirname(src2));
    const destParent = path$1.resolve(path$1.dirname(dest));
    if (destParent === srcParent || destParent === path$1.parse(destParent).root) return;
    let destStat;
    try {
      destStat = fs2.statSync(destParent, { bigint: true });
    } catch (err) {
      if (err.code === "ENOENT") return;
      throw err;
    }
    if (areIdentical(srcStat, destStat)) {
      throw new Error(errMsg(src2, dest, funcName));
    }
    return checkParentPathsSync(src2, srcStat, destParent, funcName);
  }
  function areIdentical(srcStat, destStat) {
    return destStat.ino && destStat.dev && destStat.ino === srcStat.ino && destStat.dev === srcStat.dev;
  }
  function isSrcSubdir(src2, dest) {
    const srcArr = path$1.resolve(src2).split(path$1.sep).filter((i) => i);
    const destArr = path$1.resolve(dest).split(path$1.sep).filter((i) => i);
    return srcArr.reduce((acc, cur, i) => acc && destArr[i] === cur, true);
  }
  function errMsg(src2, dest, funcName) {
    return `Cannot ${funcName} '${src2}' to a subdirectory of itself, '${dest}'.`;
  }
  stat = {
    checkPaths,
    checkPathsSync,
    checkParentPaths,
    checkParentPathsSync,
    isSrcSubdir,
    areIdentical
  };
  return stat;
}
var copy_1;
var hasRequiredCopy$1;
function requireCopy$1() {
  if (hasRequiredCopy$1) return copy_1;
  hasRequiredCopy$1 = 1;
  const fs2 = requireGracefulFs();
  const path$1 = path;
  const mkdirs2 = requireMkdirs().mkdirs;
  const pathExists = requirePathExists().pathExists;
  const utimesMillis = requireUtimes().utimesMillis;
  const stat2 = /* @__PURE__ */ requireStat();
  function copy2(src2, dest, opts, cb) {
    if (typeof opts === "function" && !cb) {
      cb = opts;
      opts = {};
    } else if (typeof opts === "function") {
      opts = { filter: opts };
    }
    cb = cb || function() {
    };
    opts = opts || {};
    opts.clobber = "clobber" in opts ? !!opts.clobber : true;
    opts.overwrite = "overwrite" in opts ? !!opts.overwrite : opts.clobber;
    if (opts.preserveTimestamps && process.arch === "ia32") {
      process.emitWarning(
        "Using the preserveTimestamps option in 32-bit node is not recommended;\n\n	see https://github.com/jprichardson/node-fs-extra/issues/269",
        "Warning",
        "fs-extra-WARN0001"
      );
    }
    stat2.checkPaths(src2, dest, "copy", opts, (err, stats) => {
      if (err) return cb(err);
      const { srcStat, destStat } = stats;
      stat2.checkParentPaths(src2, srcStat, dest, "copy", (err2) => {
        if (err2) return cb(err2);
        if (opts.filter) return handleFilter(checkParentDir, destStat, src2, dest, opts, cb);
        return checkParentDir(destStat, src2, dest, opts, cb);
      });
    });
  }
  function checkParentDir(destStat, src2, dest, opts, cb) {
    const destParent = path$1.dirname(dest);
    pathExists(destParent, (err, dirExists) => {
      if (err) return cb(err);
      if (dirExists) return getStats(destStat, src2, dest, opts, cb);
      mkdirs2(destParent, (err2) => {
        if (err2) return cb(err2);
        return getStats(destStat, src2, dest, opts, cb);
      });
    });
  }
  function handleFilter(onInclude, destStat, src2, dest, opts, cb) {
    Promise.resolve(opts.filter(src2, dest)).then((include) => {
      if (include) return onInclude(destStat, src2, dest, opts, cb);
      return cb();
    }, (error2) => cb(error2));
  }
  function startCopy(destStat, src2, dest, opts, cb) {
    if (opts.filter) return handleFilter(getStats, destStat, src2, dest, opts, cb);
    return getStats(destStat, src2, dest, opts, cb);
  }
  function getStats(destStat, src2, dest, opts, cb) {
    const stat3 = opts.dereference ? fs2.stat : fs2.lstat;
    stat3(src2, (err, srcStat) => {
      if (err) return cb(err);
      if (srcStat.isDirectory()) return onDir(srcStat, destStat, src2, dest, opts, cb);
      else if (srcStat.isFile() || srcStat.isCharacterDevice() || srcStat.isBlockDevice()) return onFile(srcStat, destStat, src2, dest, opts, cb);
      else if (srcStat.isSymbolicLink()) return onLink(destStat, src2, dest, opts, cb);
      else if (srcStat.isSocket()) return cb(new Error(`Cannot copy a socket file: ${src2}`));
      else if (srcStat.isFIFO()) return cb(new Error(`Cannot copy a FIFO pipe: ${src2}`));
      return cb(new Error(`Unknown file: ${src2}`));
    });
  }
  function onFile(srcStat, destStat, src2, dest, opts, cb) {
    if (!destStat) return copyFile(srcStat, src2, dest, opts, cb);
    return mayCopyFile(srcStat, src2, dest, opts, cb);
  }
  function mayCopyFile(srcStat, src2, dest, opts, cb) {
    if (opts.overwrite) {
      fs2.unlink(dest, (err) => {
        if (err) return cb(err);
        return copyFile(srcStat, src2, dest, opts, cb);
      });
    } else if (opts.errorOnExist) {
      return cb(new Error(`'${dest}' already exists`));
    } else return cb();
  }
  function copyFile(srcStat, src2, dest, opts, cb) {
    fs2.copyFile(src2, dest, (err) => {
      if (err) return cb(err);
      if (opts.preserveTimestamps) return handleTimestampsAndMode(srcStat.mode, src2, dest, cb);
      return setDestMode(dest, srcStat.mode, cb);
    });
  }
  function handleTimestampsAndMode(srcMode, src2, dest, cb) {
    if (fileIsNotWritable(srcMode)) {
      return makeFileWritable(dest, srcMode, (err) => {
        if (err) return cb(err);
        return setDestTimestampsAndMode(srcMode, src2, dest, cb);
      });
    }
    return setDestTimestampsAndMode(srcMode, src2, dest, cb);
  }
  function fileIsNotWritable(srcMode) {
    return (srcMode & 128) === 0;
  }
  function makeFileWritable(dest, srcMode, cb) {
    return setDestMode(dest, srcMode | 128, cb);
  }
  function setDestTimestampsAndMode(srcMode, src2, dest, cb) {
    setDestTimestamps(src2, dest, (err) => {
      if (err) return cb(err);
      return setDestMode(dest, srcMode, cb);
    });
  }
  function setDestMode(dest, srcMode, cb) {
    return fs2.chmod(dest, srcMode, cb);
  }
  function setDestTimestamps(src2, dest, cb) {
    fs2.stat(src2, (err, updatedSrcStat) => {
      if (err) return cb(err);
      return utimesMillis(dest, updatedSrcStat.atime, updatedSrcStat.mtime, cb);
    });
  }
  function onDir(srcStat, destStat, src2, dest, opts, cb) {
    if (!destStat) return mkDirAndCopy(srcStat.mode, src2, dest, opts, cb);
    return copyDir(src2, dest, opts, cb);
  }
  function mkDirAndCopy(srcMode, src2, dest, opts, cb) {
    fs2.mkdir(dest, (err) => {
      if (err) return cb(err);
      copyDir(src2, dest, opts, (err2) => {
        if (err2) return cb(err2);
        return setDestMode(dest, srcMode, cb);
      });
    });
  }
  function copyDir(src2, dest, opts, cb) {
    fs2.readdir(src2, (err, items) => {
      if (err) return cb(err);
      return copyDirItems(items, src2, dest, opts, cb);
    });
  }
  function copyDirItems(items, src2, dest, opts, cb) {
    const item = items.pop();
    if (!item) return cb();
    return copyDirItem(items, item, src2, dest, opts, cb);
  }
  function copyDirItem(items, item, src2, dest, opts, cb) {
    const srcItem = path$1.join(src2, item);
    const destItem = path$1.join(dest, item);
    stat2.checkPaths(srcItem, destItem, "copy", opts, (err, stats) => {
      if (err) return cb(err);
      const { destStat } = stats;
      startCopy(destStat, srcItem, destItem, opts, (err2) => {
        if (err2) return cb(err2);
        return copyDirItems(items, src2, dest, opts, cb);
      });
    });
  }
  function onLink(destStat, src2, dest, opts, cb) {
    fs2.readlink(src2, (err, resolvedSrc) => {
      if (err) return cb(err);
      if (opts.dereference) {
        resolvedSrc = path$1.resolve(process.cwd(), resolvedSrc);
      }
      if (!destStat) {
        return fs2.symlink(resolvedSrc, dest, cb);
      } else {
        fs2.readlink(dest, (err2, resolvedDest) => {
          if (err2) {
            if (err2.code === "EINVAL" || err2.code === "UNKNOWN") return fs2.symlink(resolvedSrc, dest, cb);
            return cb(err2);
          }
          if (opts.dereference) {
            resolvedDest = path$1.resolve(process.cwd(), resolvedDest);
          }
          if (stat2.isSrcSubdir(resolvedSrc, resolvedDest)) {
            return cb(new Error(`Cannot copy '${resolvedSrc}' to a subdirectory of itself, '${resolvedDest}'.`));
          }
          if (destStat.isDirectory() && stat2.isSrcSubdir(resolvedDest, resolvedSrc)) {
            return cb(new Error(`Cannot overwrite '${resolvedDest}' with '${resolvedSrc}'.`));
          }
          return copyLink(resolvedSrc, dest, cb);
        });
      }
    });
  }
  function copyLink(resolvedSrc, dest, cb) {
    fs2.unlink(dest, (err) => {
      if (err) return cb(err);
      return fs2.symlink(resolvedSrc, dest, cb);
    });
  }
  copy_1 = copy2;
  return copy_1;
}
var copySync_1;
var hasRequiredCopySync;
function requireCopySync() {
  if (hasRequiredCopySync) return copySync_1;
  hasRequiredCopySync = 1;
  const fs2 = requireGracefulFs();
  const path$1 = path;
  const mkdirsSync = requireMkdirs().mkdirsSync;
  const utimesMillisSync = requireUtimes().utimesMillisSync;
  const stat2 = /* @__PURE__ */ requireStat();
  function copySync(src2, dest, opts) {
    if (typeof opts === "function") {
      opts = { filter: opts };
    }
    opts = opts || {};
    opts.clobber = "clobber" in opts ? !!opts.clobber : true;
    opts.overwrite = "overwrite" in opts ? !!opts.overwrite : opts.clobber;
    if (opts.preserveTimestamps && process.arch === "ia32") {
      process.emitWarning(
        "Using the preserveTimestamps option in 32-bit node is not recommended;\n\n	see https://github.com/jprichardson/node-fs-extra/issues/269",
        "Warning",
        "fs-extra-WARN0002"
      );
    }
    const { srcStat, destStat } = stat2.checkPathsSync(src2, dest, "copy", opts);
    stat2.checkParentPathsSync(src2, srcStat, dest, "copy");
    return handleFilterAndCopy(destStat, src2, dest, opts);
  }
  function handleFilterAndCopy(destStat, src2, dest, opts) {
    if (opts.filter && !opts.filter(src2, dest)) return;
    const destParent = path$1.dirname(dest);
    if (!fs2.existsSync(destParent)) mkdirsSync(destParent);
    return getStats(destStat, src2, dest, opts);
  }
  function startCopy(destStat, src2, dest, opts) {
    if (opts.filter && !opts.filter(src2, dest)) return;
    return getStats(destStat, src2, dest, opts);
  }
  function getStats(destStat, src2, dest, opts) {
    const statSync = opts.dereference ? fs2.statSync : fs2.lstatSync;
    const srcStat = statSync(src2);
    if (srcStat.isDirectory()) return onDir(srcStat, destStat, src2, dest, opts);
    else if (srcStat.isFile() || srcStat.isCharacterDevice() || srcStat.isBlockDevice()) return onFile(srcStat, destStat, src2, dest, opts);
    else if (srcStat.isSymbolicLink()) return onLink(destStat, src2, dest, opts);
    else if (srcStat.isSocket()) throw new Error(`Cannot copy a socket file: ${src2}`);
    else if (srcStat.isFIFO()) throw new Error(`Cannot copy a FIFO pipe: ${src2}`);
    throw new Error(`Unknown file: ${src2}`);
  }
  function onFile(srcStat, destStat, src2, dest, opts) {
    if (!destStat) return copyFile(srcStat, src2, dest, opts);
    return mayCopyFile(srcStat, src2, dest, opts);
  }
  function mayCopyFile(srcStat, src2, dest, opts) {
    if (opts.overwrite) {
      fs2.unlinkSync(dest);
      return copyFile(srcStat, src2, dest, opts);
    } else if (opts.errorOnExist) {
      throw new Error(`'${dest}' already exists`);
    }
  }
  function copyFile(srcStat, src2, dest, opts) {
    fs2.copyFileSync(src2, dest);
    if (opts.preserveTimestamps) handleTimestamps(srcStat.mode, src2, dest);
    return setDestMode(dest, srcStat.mode);
  }
  function handleTimestamps(srcMode, src2, dest) {
    if (fileIsNotWritable(srcMode)) makeFileWritable(dest, srcMode);
    return setDestTimestamps(src2, dest);
  }
  function fileIsNotWritable(srcMode) {
    return (srcMode & 128) === 0;
  }
  function makeFileWritable(dest, srcMode) {
    return setDestMode(dest, srcMode | 128);
  }
  function setDestMode(dest, srcMode) {
    return fs2.chmodSync(dest, srcMode);
  }
  function setDestTimestamps(src2, dest) {
    const updatedSrcStat = fs2.statSync(src2);
    return utimesMillisSync(dest, updatedSrcStat.atime, updatedSrcStat.mtime);
  }
  function onDir(srcStat, destStat, src2, dest, opts) {
    if (!destStat) return mkDirAndCopy(srcStat.mode, src2, dest, opts);
    return copyDir(src2, dest, opts);
  }
  function mkDirAndCopy(srcMode, src2, dest, opts) {
    fs2.mkdirSync(dest);
    copyDir(src2, dest, opts);
    return setDestMode(dest, srcMode);
  }
  function copyDir(src2, dest, opts) {
    fs2.readdirSync(src2).forEach((item) => copyDirItem(item, src2, dest, opts));
  }
  function copyDirItem(item, src2, dest, opts) {
    const srcItem = path$1.join(src2, item);
    const destItem = path$1.join(dest, item);
    const { destStat } = stat2.checkPathsSync(srcItem, destItem, "copy", opts);
    return startCopy(destStat, srcItem, destItem, opts);
  }
  function onLink(destStat, src2, dest, opts) {
    let resolvedSrc = fs2.readlinkSync(src2);
    if (opts.dereference) {
      resolvedSrc = path$1.resolve(process.cwd(), resolvedSrc);
    }
    if (!destStat) {
      return fs2.symlinkSync(resolvedSrc, dest);
    } else {
      let resolvedDest;
      try {
        resolvedDest = fs2.readlinkSync(dest);
      } catch (err) {
        if (err.code === "EINVAL" || err.code === "UNKNOWN") return fs2.symlinkSync(resolvedSrc, dest);
        throw err;
      }
      if (opts.dereference) {
        resolvedDest = path$1.resolve(process.cwd(), resolvedDest);
      }
      if (stat2.isSrcSubdir(resolvedSrc, resolvedDest)) {
        throw new Error(`Cannot copy '${resolvedSrc}' to a subdirectory of itself, '${resolvedDest}'.`);
      }
      if (fs2.statSync(dest).isDirectory() && stat2.isSrcSubdir(resolvedDest, resolvedSrc)) {
        throw new Error(`Cannot overwrite '${resolvedDest}' with '${resolvedSrc}'.`);
      }
      return copyLink(resolvedSrc, dest);
    }
  }
  function copyLink(resolvedSrc, dest) {
    fs2.unlinkSync(dest);
    return fs2.symlinkSync(resolvedSrc, dest);
  }
  copySync_1 = copySync;
  return copySync_1;
}
var copy;
var hasRequiredCopy;
function requireCopy() {
  if (hasRequiredCopy) return copy;
  hasRequiredCopy = 1;
  const u = requireUniversalify().fromCallback;
  copy = {
    copy: u(/* @__PURE__ */ requireCopy$1()),
    copySync: /* @__PURE__ */ requireCopySync()
  };
  return copy;
}
var rimraf_1;
var hasRequiredRimraf;
function requireRimraf() {
  if (hasRequiredRimraf) return rimraf_1;
  hasRequiredRimraf = 1;
  const fs2 = requireGracefulFs();
  const path$1 = path;
  const assert = require$$5;
  const isWindows = process.platform === "win32";
  function defaults(options) {
    const methods = [
      "unlink",
      "chmod",
      "stat",
      "lstat",
      "rmdir",
      "readdir"
    ];
    methods.forEach((m) => {
      options[m] = options[m] || fs2[m];
      m = m + "Sync";
      options[m] = options[m] || fs2[m];
    });
    options.maxBusyTries = options.maxBusyTries || 3;
  }
  function rimraf(p, options, cb) {
    let busyTries = 0;
    if (typeof options === "function") {
      cb = options;
      options = {};
    }
    assert(p, "rimraf: missing path");
    assert.strictEqual(typeof p, "string", "rimraf: path should be a string");
    assert.strictEqual(typeof cb, "function", "rimraf: callback function required");
    assert(options, "rimraf: invalid options argument provided");
    assert.strictEqual(typeof options, "object", "rimraf: options should be object");
    defaults(options);
    rimraf_(p, options, function CB(er) {
      if (er) {
        if ((er.code === "EBUSY" || er.code === "ENOTEMPTY" || er.code === "EPERM") && busyTries < options.maxBusyTries) {
          busyTries++;
          const time = busyTries * 100;
          return setTimeout(() => rimraf_(p, options, CB), time);
        }
        if (er.code === "ENOENT") er = null;
      }
      cb(er);
    });
  }
  function rimraf_(p, options, cb) {
    assert(p);
    assert(options);
    assert(typeof cb === "function");
    options.lstat(p, (er, st) => {
      if (er && er.code === "ENOENT") {
        return cb(null);
      }
      if (er && er.code === "EPERM" && isWindows) {
        return fixWinEPERM(p, options, er, cb);
      }
      if (st && st.isDirectory()) {
        return rmdir(p, options, er, cb);
      }
      options.unlink(p, (er2) => {
        if (er2) {
          if (er2.code === "ENOENT") {
            return cb(null);
          }
          if (er2.code === "EPERM") {
            return isWindows ? fixWinEPERM(p, options, er2, cb) : rmdir(p, options, er2, cb);
          }
          if (er2.code === "EISDIR") {
            return rmdir(p, options, er2, cb);
          }
        }
        return cb(er2);
      });
    });
  }
  function fixWinEPERM(p, options, er, cb) {
    assert(p);
    assert(options);
    assert(typeof cb === "function");
    options.chmod(p, 438, (er2) => {
      if (er2) {
        cb(er2.code === "ENOENT" ? null : er);
      } else {
        options.stat(p, (er3, stats) => {
          if (er3) {
            cb(er3.code === "ENOENT" ? null : er);
          } else if (stats.isDirectory()) {
            rmdir(p, options, er, cb);
          } else {
            options.unlink(p, cb);
          }
        });
      }
    });
  }
  function fixWinEPERMSync(p, options, er) {
    let stats;
    assert(p);
    assert(options);
    try {
      options.chmodSync(p, 438);
    } catch (er2) {
      if (er2.code === "ENOENT") {
        return;
      } else {
        throw er;
      }
    }
    try {
      stats = options.statSync(p);
    } catch (er3) {
      if (er3.code === "ENOENT") {
        return;
      } else {
        throw er;
      }
    }
    if (stats.isDirectory()) {
      rmdirSync(p, options, er);
    } else {
      options.unlinkSync(p);
    }
  }
  function rmdir(p, options, originalEr, cb) {
    assert(p);
    assert(options);
    assert(typeof cb === "function");
    options.rmdir(p, (er) => {
      if (er && (er.code === "ENOTEMPTY" || er.code === "EEXIST" || er.code === "EPERM")) {
        rmkids(p, options, cb);
      } else if (er && er.code === "ENOTDIR") {
        cb(originalEr);
      } else {
        cb(er);
      }
    });
  }
  function rmkids(p, options, cb) {
    assert(p);
    assert(options);
    assert(typeof cb === "function");
    options.readdir(p, (er, files) => {
      if (er) return cb(er);
      let n = files.length;
      let errState;
      if (n === 0) return options.rmdir(p, cb);
      files.forEach((f) => {
        rimraf(path$1.join(p, f), options, (er2) => {
          if (errState) {
            return;
          }
          if (er2) return cb(errState = er2);
          if (--n === 0) {
            options.rmdir(p, cb);
          }
        });
      });
    });
  }
  function rimrafSync(p, options) {
    let st;
    options = options || {};
    defaults(options);
    assert(p, "rimraf: missing path");
    assert.strictEqual(typeof p, "string", "rimraf: path should be a string");
    assert(options, "rimraf: missing options");
    assert.strictEqual(typeof options, "object", "rimraf: options should be object");
    try {
      st = options.lstatSync(p);
    } catch (er) {
      if (er.code === "ENOENT") {
        return;
      }
      if (er.code === "EPERM" && isWindows) {
        fixWinEPERMSync(p, options, er);
      }
    }
    try {
      if (st && st.isDirectory()) {
        rmdirSync(p, options, null);
      } else {
        options.unlinkSync(p);
      }
    } catch (er) {
      if (er.code === "ENOENT") {
        return;
      } else if (er.code === "EPERM") {
        return isWindows ? fixWinEPERMSync(p, options, er) : rmdirSync(p, options, er);
      } else if (er.code !== "EISDIR") {
        throw er;
      }
      rmdirSync(p, options, er);
    }
  }
  function rmdirSync(p, options, originalEr) {
    assert(p);
    assert(options);
    try {
      options.rmdirSync(p);
    } catch (er) {
      if (er.code === "ENOTDIR") {
        throw originalEr;
      } else if (er.code === "ENOTEMPTY" || er.code === "EEXIST" || er.code === "EPERM") {
        rmkidsSync(p, options);
      } else if (er.code !== "ENOENT") {
        throw er;
      }
    }
  }
  function rmkidsSync(p, options) {
    assert(p);
    assert(options);
    options.readdirSync(p).forEach((f) => rimrafSync(path$1.join(p, f), options));
    if (isWindows) {
      const startTime = Date.now();
      do {
        try {
          const ret = options.rmdirSync(p, options);
          return ret;
        } catch {
        }
      } while (Date.now() - startTime < 500);
    } else {
      const ret = options.rmdirSync(p, options);
      return ret;
    }
  }
  rimraf_1 = rimraf;
  rimraf.sync = rimrafSync;
  return rimraf_1;
}
var remove_1;
var hasRequiredRemove;
function requireRemove() {
  if (hasRequiredRemove) return remove_1;
  hasRequiredRemove = 1;
  const fs2 = requireGracefulFs();
  const u = requireUniversalify().fromCallback;
  const rimraf = /* @__PURE__ */ requireRimraf();
  function remove(path2, callback) {
    if (fs2.rm) return fs2.rm(path2, { recursive: true, force: true }, callback);
    rimraf(path2, callback);
  }
  function removeSync(path2) {
    if (fs2.rmSync) return fs2.rmSync(path2, { recursive: true, force: true });
    rimraf.sync(path2);
  }
  remove_1 = {
    remove: u(remove),
    removeSync
  };
  return remove_1;
}
var empty;
var hasRequiredEmpty;
function requireEmpty() {
  if (hasRequiredEmpty) return empty;
  hasRequiredEmpty = 1;
  const u = requireUniversalify().fromPromise;
  const fs2 = /* @__PURE__ */ requireFs();
  const path$1 = path;
  const mkdir = /* @__PURE__ */ requireMkdirs();
  const remove = /* @__PURE__ */ requireRemove();
  const emptyDir = u(async function emptyDir2(dir) {
    let items;
    try {
      items = await fs2.readdir(dir);
    } catch {
      return mkdir.mkdirs(dir);
    }
    return Promise.all(items.map((item) => remove.remove(path$1.join(dir, item))));
  });
  function emptyDirSync(dir) {
    let items;
    try {
      items = fs2.readdirSync(dir);
    } catch {
      return mkdir.mkdirsSync(dir);
    }
    items.forEach((item) => {
      item = path$1.join(dir, item);
      remove.removeSync(item);
    });
  }
  empty = {
    emptyDirSync,
    emptydirSync: emptyDirSync,
    emptyDir,
    emptydir: emptyDir
  };
  return empty;
}
var file;
var hasRequiredFile;
function requireFile() {
  if (hasRequiredFile) return file;
  hasRequiredFile = 1;
  const u = requireUniversalify().fromCallback;
  const path$1 = path;
  const fs2 = requireGracefulFs();
  const mkdir = /* @__PURE__ */ requireMkdirs();
  function createFile(file2, callback) {
    function makeFile() {
      fs2.writeFile(file2, "", (err) => {
        if (err) return callback(err);
        callback();
      });
    }
    fs2.stat(file2, (err, stats) => {
      if (!err && stats.isFile()) return callback();
      const dir = path$1.dirname(file2);
      fs2.stat(dir, (err2, stats2) => {
        if (err2) {
          if (err2.code === "ENOENT") {
            return mkdir.mkdirs(dir, (err3) => {
              if (err3) return callback(err3);
              makeFile();
            });
          }
          return callback(err2);
        }
        if (stats2.isDirectory()) makeFile();
        else {
          fs2.readdir(dir, (err3) => {
            if (err3) return callback(err3);
          });
        }
      });
    });
  }
  function createFileSync(file2) {
    let stats;
    try {
      stats = fs2.statSync(file2);
    } catch {
    }
    if (stats && stats.isFile()) return;
    const dir = path$1.dirname(file2);
    try {
      if (!fs2.statSync(dir).isDirectory()) {
        fs2.readdirSync(dir);
      }
    } catch (err) {
      if (err && err.code === "ENOENT") mkdir.mkdirsSync(dir);
      else throw err;
    }
    fs2.writeFileSync(file2, "");
  }
  file = {
    createFile: u(createFile),
    createFileSync
  };
  return file;
}
var link;
var hasRequiredLink;
function requireLink() {
  if (hasRequiredLink) return link;
  hasRequiredLink = 1;
  const u = requireUniversalify().fromCallback;
  const path$1 = path;
  const fs2 = requireGracefulFs();
  const mkdir = /* @__PURE__ */ requireMkdirs();
  const pathExists = requirePathExists().pathExists;
  const { areIdentical } = /* @__PURE__ */ requireStat();
  function createLink(srcpath, dstpath, callback) {
    function makeLink(srcpath2, dstpath2) {
      fs2.link(srcpath2, dstpath2, (err) => {
        if (err) return callback(err);
        callback(null);
      });
    }
    fs2.lstat(dstpath, (_, dstStat) => {
      fs2.lstat(srcpath, (err, srcStat) => {
        if (err) {
          err.message = err.message.replace("lstat", "ensureLink");
          return callback(err);
        }
        if (dstStat && areIdentical(srcStat, dstStat)) return callback(null);
        const dir = path$1.dirname(dstpath);
        pathExists(dir, (err2, dirExists) => {
          if (err2) return callback(err2);
          if (dirExists) return makeLink(srcpath, dstpath);
          mkdir.mkdirs(dir, (err3) => {
            if (err3) return callback(err3);
            makeLink(srcpath, dstpath);
          });
        });
      });
    });
  }
  function createLinkSync(srcpath, dstpath) {
    let dstStat;
    try {
      dstStat = fs2.lstatSync(dstpath);
    } catch {
    }
    try {
      const srcStat = fs2.lstatSync(srcpath);
      if (dstStat && areIdentical(srcStat, dstStat)) return;
    } catch (err) {
      err.message = err.message.replace("lstat", "ensureLink");
      throw err;
    }
    const dir = path$1.dirname(dstpath);
    const dirExists = fs2.existsSync(dir);
    if (dirExists) return fs2.linkSync(srcpath, dstpath);
    mkdir.mkdirsSync(dir);
    return fs2.linkSync(srcpath, dstpath);
  }
  link = {
    createLink: u(createLink),
    createLinkSync
  };
  return link;
}
var symlinkPaths_1;
var hasRequiredSymlinkPaths;
function requireSymlinkPaths() {
  if (hasRequiredSymlinkPaths) return symlinkPaths_1;
  hasRequiredSymlinkPaths = 1;
  const path$1 = path;
  const fs2 = requireGracefulFs();
  const pathExists = requirePathExists().pathExists;
  function symlinkPaths(srcpath, dstpath, callback) {
    if (path$1.isAbsolute(srcpath)) {
      return fs2.lstat(srcpath, (err) => {
        if (err) {
          err.message = err.message.replace("lstat", "ensureSymlink");
          return callback(err);
        }
        return callback(null, {
          toCwd: srcpath,
          toDst: srcpath
        });
      });
    } else {
      const dstdir = path$1.dirname(dstpath);
      const relativeToDst = path$1.join(dstdir, srcpath);
      return pathExists(relativeToDst, (err, exists) => {
        if (err) return callback(err);
        if (exists) {
          return callback(null, {
            toCwd: relativeToDst,
            toDst: srcpath
          });
        } else {
          return fs2.lstat(srcpath, (err2) => {
            if (err2) {
              err2.message = err2.message.replace("lstat", "ensureSymlink");
              return callback(err2);
            }
            return callback(null, {
              toCwd: srcpath,
              toDst: path$1.relative(dstdir, srcpath)
            });
          });
        }
      });
    }
  }
  function symlinkPathsSync(srcpath, dstpath) {
    let exists;
    if (path$1.isAbsolute(srcpath)) {
      exists = fs2.existsSync(srcpath);
      if (!exists) throw new Error("absolute srcpath does not exist");
      return {
        toCwd: srcpath,
        toDst: srcpath
      };
    } else {
      const dstdir = path$1.dirname(dstpath);
      const relativeToDst = path$1.join(dstdir, srcpath);
      exists = fs2.existsSync(relativeToDst);
      if (exists) {
        return {
          toCwd: relativeToDst,
          toDst: srcpath
        };
      } else {
        exists = fs2.existsSync(srcpath);
        if (!exists) throw new Error("relative srcpath does not exist");
        return {
          toCwd: srcpath,
          toDst: path$1.relative(dstdir, srcpath)
        };
      }
    }
  }
  symlinkPaths_1 = {
    symlinkPaths,
    symlinkPathsSync
  };
  return symlinkPaths_1;
}
var symlinkType_1;
var hasRequiredSymlinkType;
function requireSymlinkType() {
  if (hasRequiredSymlinkType) return symlinkType_1;
  hasRequiredSymlinkType = 1;
  const fs2 = requireGracefulFs();
  function symlinkType(srcpath, type2, callback) {
    callback = typeof type2 === "function" ? type2 : callback;
    type2 = typeof type2 === "function" ? false : type2;
    if (type2) return callback(null, type2);
    fs2.lstat(srcpath, (err, stats) => {
      if (err) return callback(null, "file");
      type2 = stats && stats.isDirectory() ? "dir" : "file";
      callback(null, type2);
    });
  }
  function symlinkTypeSync(srcpath, type2) {
    let stats;
    if (type2) return type2;
    try {
      stats = fs2.lstatSync(srcpath);
    } catch {
      return "file";
    }
    return stats && stats.isDirectory() ? "dir" : "file";
  }
  symlinkType_1 = {
    symlinkType,
    symlinkTypeSync
  };
  return symlinkType_1;
}
var symlink;
var hasRequiredSymlink;
function requireSymlink() {
  if (hasRequiredSymlink) return symlink;
  hasRequiredSymlink = 1;
  const u = requireUniversalify().fromCallback;
  const path$1 = path;
  const fs2 = /* @__PURE__ */ requireFs();
  const _mkdirs = /* @__PURE__ */ requireMkdirs();
  const mkdirs2 = _mkdirs.mkdirs;
  const mkdirsSync = _mkdirs.mkdirsSync;
  const _symlinkPaths = /* @__PURE__ */ requireSymlinkPaths();
  const symlinkPaths = _symlinkPaths.symlinkPaths;
  const symlinkPathsSync = _symlinkPaths.symlinkPathsSync;
  const _symlinkType = /* @__PURE__ */ requireSymlinkType();
  const symlinkType = _symlinkType.symlinkType;
  const symlinkTypeSync = _symlinkType.symlinkTypeSync;
  const pathExists = requirePathExists().pathExists;
  const { areIdentical } = /* @__PURE__ */ requireStat();
  function createSymlink(srcpath, dstpath, type2, callback) {
    callback = typeof type2 === "function" ? type2 : callback;
    type2 = typeof type2 === "function" ? false : type2;
    fs2.lstat(dstpath, (err, stats) => {
      if (!err && stats.isSymbolicLink()) {
        Promise.all([
          fs2.stat(srcpath),
          fs2.stat(dstpath)
        ]).then(([srcStat, dstStat]) => {
          if (areIdentical(srcStat, dstStat)) return callback(null);
          _createSymlink(srcpath, dstpath, type2, callback);
        });
      } else _createSymlink(srcpath, dstpath, type2, callback);
    });
  }
  function _createSymlink(srcpath, dstpath, type2, callback) {
    symlinkPaths(srcpath, dstpath, (err, relative) => {
      if (err) return callback(err);
      srcpath = relative.toDst;
      symlinkType(relative.toCwd, type2, (err2, type3) => {
        if (err2) return callback(err2);
        const dir = path$1.dirname(dstpath);
        pathExists(dir, (err3, dirExists) => {
          if (err3) return callback(err3);
          if (dirExists) return fs2.symlink(srcpath, dstpath, type3, callback);
          mkdirs2(dir, (err4) => {
            if (err4) return callback(err4);
            fs2.symlink(srcpath, dstpath, type3, callback);
          });
        });
      });
    });
  }
  function createSymlinkSync(srcpath, dstpath, type2) {
    let stats;
    try {
      stats = fs2.lstatSync(dstpath);
    } catch {
    }
    if (stats && stats.isSymbolicLink()) {
      const srcStat = fs2.statSync(srcpath);
      const dstStat = fs2.statSync(dstpath);
      if (areIdentical(srcStat, dstStat)) return;
    }
    const relative = symlinkPathsSync(srcpath, dstpath);
    srcpath = relative.toDst;
    type2 = symlinkTypeSync(relative.toCwd, type2);
    const dir = path$1.dirname(dstpath);
    const exists = fs2.existsSync(dir);
    if (exists) return fs2.symlinkSync(srcpath, dstpath, type2);
    mkdirsSync(dir);
    return fs2.symlinkSync(srcpath, dstpath, type2);
  }
  symlink = {
    createSymlink: u(createSymlink),
    createSymlinkSync
  };
  return symlink;
}
var ensure;
var hasRequiredEnsure;
function requireEnsure() {
  if (hasRequiredEnsure) return ensure;
  hasRequiredEnsure = 1;
  const { createFile, createFileSync } = /* @__PURE__ */ requireFile();
  const { createLink, createLinkSync } = /* @__PURE__ */ requireLink();
  const { createSymlink, createSymlinkSync } = /* @__PURE__ */ requireSymlink();
  ensure = {
    // file
    createFile,
    createFileSync,
    ensureFile: createFile,
    ensureFileSync: createFileSync,
    // link
    createLink,
    createLinkSync,
    ensureLink: createLink,
    ensureLinkSync: createLinkSync,
    // symlink
    createSymlink,
    createSymlinkSync,
    ensureSymlink: createSymlink,
    ensureSymlinkSync: createSymlinkSync
  };
  return ensure;
}
var utils$1;
var hasRequiredUtils$1;
function requireUtils$1() {
  if (hasRequiredUtils$1) return utils$1;
  hasRequiredUtils$1 = 1;
  function stringify(obj, { EOL = "\n", finalEOL = true, replacer = null, spaces } = {}) {
    const EOF = finalEOL ? EOL : "";
    const str2 = JSON.stringify(obj, replacer, spaces);
    return str2.replace(/\n/g, EOL) + EOF;
  }
  function stripBom2(content) {
    if (Buffer.isBuffer(content)) content = content.toString("utf8");
    return content.replace(/^\uFEFF/, "");
  }
  utils$1 = { stringify, stripBom: stripBom2 };
  return utils$1;
}
var jsonfile$1;
var hasRequiredJsonfile$1;
function requireJsonfile$1() {
  if (hasRequiredJsonfile$1) return jsonfile$1;
  hasRequiredJsonfile$1 = 1;
  let _fs;
  try {
    _fs = requireGracefulFs();
  } catch (_) {
    _fs = fs$1;
  }
  const universalify2 = requireUniversalify();
  const { stringify, stripBom: stripBom2 } = requireUtils$1();
  async function _readFile(file2, options = {}) {
    if (typeof options === "string") {
      options = { encoding: options };
    }
    const fs2 = options.fs || _fs;
    const shouldThrow = "throws" in options ? options.throws : true;
    let data = await universalify2.fromCallback(fs2.readFile)(file2, options);
    data = stripBom2(data);
    let obj;
    try {
      obj = JSON.parse(data, options ? options.reviver : null);
    } catch (err) {
      if (shouldThrow) {
        err.message = `${file2}: ${err.message}`;
        throw err;
      } else {
        return null;
      }
    }
    return obj;
  }
  const readFile = universalify2.fromPromise(_readFile);
  function readFileSync(file2, options = {}) {
    if (typeof options === "string") {
      options = { encoding: options };
    }
    const fs2 = options.fs || _fs;
    const shouldThrow = "throws" in options ? options.throws : true;
    try {
      let content = fs2.readFileSync(file2, options);
      content = stripBom2(content);
      return JSON.parse(content, options.reviver);
    } catch (err) {
      if (shouldThrow) {
        err.message = `${file2}: ${err.message}`;
        throw err;
      } else {
        return null;
      }
    }
  }
  async function _writeFile(file2, obj, options = {}) {
    const fs2 = options.fs || _fs;
    const str2 = stringify(obj, options);
    await universalify2.fromCallback(fs2.writeFile)(file2, str2, options);
  }
  const writeFile = universalify2.fromPromise(_writeFile);
  function writeFileSync(file2, obj, options = {}) {
    const fs2 = options.fs || _fs;
    const str2 = stringify(obj, options);
    return fs2.writeFileSync(file2, str2, options);
  }
  jsonfile$1 = {
    readFile,
    readFileSync,
    writeFile,
    writeFileSync
  };
  return jsonfile$1;
}
var jsonfile;
var hasRequiredJsonfile;
function requireJsonfile() {
  if (hasRequiredJsonfile) return jsonfile;
  hasRequiredJsonfile = 1;
  const jsonFile = requireJsonfile$1();
  jsonfile = {
    // jsonfile exports
    readJson: jsonFile.readFile,
    readJsonSync: jsonFile.readFileSync,
    writeJson: jsonFile.writeFile,
    writeJsonSync: jsonFile.writeFileSync
  };
  return jsonfile;
}
var outputFile_1;
var hasRequiredOutputFile;
function requireOutputFile() {
  if (hasRequiredOutputFile) return outputFile_1;
  hasRequiredOutputFile = 1;
  const u = requireUniversalify().fromCallback;
  const fs2 = requireGracefulFs();
  const path$1 = path;
  const mkdir = /* @__PURE__ */ requireMkdirs();
  const pathExists = requirePathExists().pathExists;
  function outputFile(file2, data, encoding, callback) {
    if (typeof encoding === "function") {
      callback = encoding;
      encoding = "utf8";
    }
    const dir = path$1.dirname(file2);
    pathExists(dir, (err, itDoes) => {
      if (err) return callback(err);
      if (itDoes) return fs2.writeFile(file2, data, encoding, callback);
      mkdir.mkdirs(dir, (err2) => {
        if (err2) return callback(err2);
        fs2.writeFile(file2, data, encoding, callback);
      });
    });
  }
  function outputFileSync(file2, ...args) {
    const dir = path$1.dirname(file2);
    if (fs2.existsSync(dir)) {
      return fs2.writeFileSync(file2, ...args);
    }
    mkdir.mkdirsSync(dir);
    fs2.writeFileSync(file2, ...args);
  }
  outputFile_1 = {
    outputFile: u(outputFile),
    outputFileSync
  };
  return outputFile_1;
}
var outputJson_1;
var hasRequiredOutputJson;
function requireOutputJson() {
  if (hasRequiredOutputJson) return outputJson_1;
  hasRequiredOutputJson = 1;
  const { stringify } = requireUtils$1();
  const { outputFile } = /* @__PURE__ */ requireOutputFile();
  async function outputJson(file2, data, options = {}) {
    const str2 = stringify(data, options);
    await outputFile(file2, str2, options);
  }
  outputJson_1 = outputJson;
  return outputJson_1;
}
var outputJsonSync_1;
var hasRequiredOutputJsonSync;
function requireOutputJsonSync() {
  if (hasRequiredOutputJsonSync) return outputJsonSync_1;
  hasRequiredOutputJsonSync = 1;
  const { stringify } = requireUtils$1();
  const { outputFileSync } = /* @__PURE__ */ requireOutputFile();
  function outputJsonSync(file2, data, options) {
    const str2 = stringify(data, options);
    outputFileSync(file2, str2, options);
  }
  outputJsonSync_1 = outputJsonSync;
  return outputJsonSync_1;
}
var json$1;
var hasRequiredJson$1;
function requireJson$1() {
  if (hasRequiredJson$1) return json$1;
  hasRequiredJson$1 = 1;
  const u = requireUniversalify().fromPromise;
  const jsonFile = /* @__PURE__ */ requireJsonfile();
  jsonFile.outputJson = u(/* @__PURE__ */ requireOutputJson());
  jsonFile.outputJsonSync = /* @__PURE__ */ requireOutputJsonSync();
  jsonFile.outputJSON = jsonFile.outputJson;
  jsonFile.outputJSONSync = jsonFile.outputJsonSync;
  jsonFile.writeJSON = jsonFile.writeJson;
  jsonFile.writeJSONSync = jsonFile.writeJsonSync;
  jsonFile.readJSON = jsonFile.readJson;
  jsonFile.readJSONSync = jsonFile.readJsonSync;
  json$1 = jsonFile;
  return json$1;
}
var move_1;
var hasRequiredMove$1;
function requireMove$1() {
  if (hasRequiredMove$1) return move_1;
  hasRequiredMove$1 = 1;
  const fs2 = requireGracefulFs();
  const path$1 = path;
  const copy2 = requireCopy().copy;
  const remove = requireRemove().remove;
  const mkdirp = requireMkdirs().mkdirp;
  const pathExists = requirePathExists().pathExists;
  const stat2 = /* @__PURE__ */ requireStat();
  function move2(src2, dest, opts, cb) {
    if (typeof opts === "function") {
      cb = opts;
      opts = {};
    }
    opts = opts || {};
    const overwrite = opts.overwrite || opts.clobber || false;
    stat2.checkPaths(src2, dest, "move", opts, (err, stats) => {
      if (err) return cb(err);
      const { srcStat, isChangingCase = false } = stats;
      stat2.checkParentPaths(src2, srcStat, dest, "move", (err2) => {
        if (err2) return cb(err2);
        if (isParentRoot(dest)) return doRename(src2, dest, overwrite, isChangingCase, cb);
        mkdirp(path$1.dirname(dest), (err3) => {
          if (err3) return cb(err3);
          return doRename(src2, dest, overwrite, isChangingCase, cb);
        });
      });
    });
  }
  function isParentRoot(dest) {
    const parent = path$1.dirname(dest);
    const parsedPath = path$1.parse(parent);
    return parsedPath.root === parent;
  }
  function doRename(src2, dest, overwrite, isChangingCase, cb) {
    if (isChangingCase) return rename(src2, dest, overwrite, cb);
    if (overwrite) {
      return remove(dest, (err) => {
        if (err) return cb(err);
        return rename(src2, dest, overwrite, cb);
      });
    }
    pathExists(dest, (err, destExists) => {
      if (err) return cb(err);
      if (destExists) return cb(new Error("dest already exists."));
      return rename(src2, dest, overwrite, cb);
    });
  }
  function rename(src2, dest, overwrite, cb) {
    fs2.rename(src2, dest, (err) => {
      if (!err) return cb();
      if (err.code !== "EXDEV") return cb(err);
      return moveAcrossDevice(src2, dest, overwrite, cb);
    });
  }
  function moveAcrossDevice(src2, dest, overwrite, cb) {
    const opts = {
      overwrite,
      errorOnExist: true
    };
    copy2(src2, dest, opts, (err) => {
      if (err) return cb(err);
      return remove(src2, cb);
    });
  }
  move_1 = move2;
  return move_1;
}
var moveSync_1;
var hasRequiredMoveSync;
function requireMoveSync() {
  if (hasRequiredMoveSync) return moveSync_1;
  hasRequiredMoveSync = 1;
  const fs2 = requireGracefulFs();
  const path$1 = path;
  const copySync = requireCopy().copySync;
  const removeSync = requireRemove().removeSync;
  const mkdirpSync = requireMkdirs().mkdirpSync;
  const stat2 = /* @__PURE__ */ requireStat();
  function moveSync(src2, dest, opts) {
    opts = opts || {};
    const overwrite = opts.overwrite || opts.clobber || false;
    const { srcStat, isChangingCase = false } = stat2.checkPathsSync(src2, dest, "move", opts);
    stat2.checkParentPathsSync(src2, srcStat, dest, "move");
    if (!isParentRoot(dest)) mkdirpSync(path$1.dirname(dest));
    return doRename(src2, dest, overwrite, isChangingCase);
  }
  function isParentRoot(dest) {
    const parent = path$1.dirname(dest);
    const parsedPath = path$1.parse(parent);
    return parsedPath.root === parent;
  }
  function doRename(src2, dest, overwrite, isChangingCase) {
    if (isChangingCase) return rename(src2, dest, overwrite);
    if (overwrite) {
      removeSync(dest);
      return rename(src2, dest, overwrite);
    }
    if (fs2.existsSync(dest)) throw new Error("dest already exists.");
    return rename(src2, dest, overwrite);
  }
  function rename(src2, dest, overwrite) {
    try {
      fs2.renameSync(src2, dest);
    } catch (err) {
      if (err.code !== "EXDEV") throw err;
      return moveAcrossDevice(src2, dest, overwrite);
    }
  }
  function moveAcrossDevice(src2, dest, overwrite) {
    const opts = {
      overwrite,
      errorOnExist: true
    };
    copySync(src2, dest, opts);
    return removeSync(src2);
  }
  moveSync_1 = moveSync;
  return moveSync_1;
}
var move;
var hasRequiredMove;
function requireMove() {
  if (hasRequiredMove) return move;
  hasRequiredMove = 1;
  const u = requireUniversalify().fromCallback;
  move = {
    move: u(/* @__PURE__ */ requireMove$1()),
    moveSync: /* @__PURE__ */ requireMoveSync()
  };
  return move;
}
var lib;
var hasRequiredLib;
function requireLib() {
  if (hasRequiredLib) return lib;
  hasRequiredLib = 1;
  lib = {
    // Export promiseified graceful-fs:
    .../* @__PURE__ */ requireFs(),
    // Export extra methods:
    .../* @__PURE__ */ requireCopy(),
    .../* @__PURE__ */ requireEmpty(),
    .../* @__PURE__ */ requireEnsure(),
    .../* @__PURE__ */ requireJson$1(),
    .../* @__PURE__ */ requireMkdirs(),
    .../* @__PURE__ */ requireMove(),
    .../* @__PURE__ */ requireOutputFile(),
    .../* @__PURE__ */ requirePathExists(),
    .../* @__PURE__ */ requireRemove()
  };
  return lib;
}
var BaseUpdater = {};
var AppUpdater = {};
var out = {};
var CancellationToken = {};
var hasRequiredCancellationToken;
function requireCancellationToken() {
  if (hasRequiredCancellationToken) return CancellationToken;
  hasRequiredCancellationToken = 1;
  Object.defineProperty(CancellationToken, "__esModule", { value: true });
  CancellationToken.CancellationError = CancellationToken.CancellationToken = void 0;
  const events_1 = require$$0$2;
  let CancellationToken$1 = class CancellationToken extends events_1.EventEmitter {
    get cancelled() {
      return this._cancelled || this._parent != null && this._parent.cancelled;
    }
    set parent(value) {
      this.removeParentCancelHandler();
      this._parent = value;
      this.parentCancelHandler = () => this.cancel();
      this._parent.onCancel(this.parentCancelHandler);
    }
    // babel cannot compile ... correctly for super calls
    constructor(parent) {
      super();
      this.parentCancelHandler = null;
      this._parent = null;
      this._cancelled = false;
      if (parent != null) {
        this.parent = parent;
      }
    }
    cancel() {
      this._cancelled = true;
      this.emit("cancel");
    }
    onCancel(handler) {
      if (this.cancelled) {
        handler();
      } else {
        this.once("cancel", handler);
      }
    }
    createPromise(callback) {
      if (this.cancelled) {
        return Promise.reject(new CancellationError());
      }
      const finallyHandler = () => {
        if (cancelHandler != null) {
          try {
            this.removeListener("cancel", cancelHandler);
            cancelHandler = null;
          } catch (_ignore) {
          }
        }
      };
      let cancelHandler = null;
      return new Promise((resolve, reject) => {
        let addedCancelHandler = null;
        cancelHandler = () => {
          try {
            if (addedCancelHandler != null) {
              addedCancelHandler();
              addedCancelHandler = null;
            }
          } finally {
            reject(new CancellationError());
          }
        };
        if (this.cancelled) {
          cancelHandler();
          return;
        }
        this.onCancel(cancelHandler);
        callback(resolve, reject, (callback2) => {
          addedCancelHandler = callback2;
        });
      }).then((it) => {
        finallyHandler();
        return it;
      }).catch((e) => {
        finallyHandler();
        throw e;
      });
    }
    removeParentCancelHandler() {
      const parent = this._parent;
      if (parent != null && this.parentCancelHandler != null) {
        parent.removeListener("cancel", this.parentCancelHandler);
        this.parentCancelHandler = null;
      }
    }
    dispose() {
      try {
        this.removeParentCancelHandler();
      } finally {
        this.removeAllListeners();
        this._parent = null;
      }
    }
  };
  CancellationToken.CancellationToken = CancellationToken$1;
  class CancellationError extends Error {
    constructor() {
      super("cancelled");
    }
  }
  CancellationToken.CancellationError = CancellationError;
  return CancellationToken;
}
var error = {};
var hasRequiredError;
function requireError() {
  if (hasRequiredError) return error;
  hasRequiredError = 1;
  Object.defineProperty(error, "__esModule", { value: true });
  error.newError = newError;
  function newError(message, code) {
    const error2 = new Error(message);
    error2.code = code;
    return error2;
  }
  return error;
}
var httpExecutor = {};
var src = { exports: {} };
var browser = { exports: {} };
var ms;
var hasRequiredMs;
function requireMs() {
  if (hasRequiredMs) return ms;
  hasRequiredMs = 1;
  var s = 1e3;
  var m = s * 60;
  var h = m * 60;
  var d = h * 24;
  var w = d * 7;
  var y = d * 365.25;
  ms = function(val, options) {
    options = options || {};
    var type2 = typeof val;
    if (type2 === "string" && val.length > 0) {
      return parse(val);
    } else if (type2 === "number" && isFinite(val)) {
      return options.long ? fmtLong(val) : fmtShort(val);
    }
    throw new Error(
      "val is not a non-empty string or a valid number. val=" + JSON.stringify(val)
    );
  };
  function parse(str2) {
    str2 = String(str2);
    if (str2.length > 100) {
      return;
    }
    var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
      str2
    );
    if (!match) {
      return;
    }
    var n = parseFloat(match[1]);
    var type2 = (match[2] || "ms").toLowerCase();
    switch (type2) {
      case "years":
      case "year":
      case "yrs":
      case "yr":
      case "y":
        return n * y;
      case "weeks":
      case "week":
      case "w":
        return n * w;
      case "days":
      case "day":
      case "d":
        return n * d;
      case "hours":
      case "hour":
      case "hrs":
      case "hr":
      case "h":
        return n * h;
      case "minutes":
      case "minute":
      case "mins":
      case "min":
      case "m":
        return n * m;
      case "seconds":
      case "second":
      case "secs":
      case "sec":
      case "s":
        return n * s;
      case "milliseconds":
      case "millisecond":
      case "msecs":
      case "msec":
      case "ms":
        return n;
      default:
        return void 0;
    }
  }
  function fmtShort(ms2) {
    var msAbs = Math.abs(ms2);
    if (msAbs >= d) {
      return Math.round(ms2 / d) + "d";
    }
    if (msAbs >= h) {
      return Math.round(ms2 / h) + "h";
    }
    if (msAbs >= m) {
      return Math.round(ms2 / m) + "m";
    }
    if (msAbs >= s) {
      return Math.round(ms2 / s) + "s";
    }
    return ms2 + "ms";
  }
  function fmtLong(ms2) {
    var msAbs = Math.abs(ms2);
    if (msAbs >= d) {
      return plural(ms2, msAbs, d, "day");
    }
    if (msAbs >= h) {
      return plural(ms2, msAbs, h, "hour");
    }
    if (msAbs >= m) {
      return plural(ms2, msAbs, m, "minute");
    }
    if (msAbs >= s) {
      return plural(ms2, msAbs, s, "second");
    }
    return ms2 + " ms";
  }
  function plural(ms2, msAbs, n, name) {
    var isPlural = msAbs >= n * 1.5;
    return Math.round(ms2 / n) + " " + name + (isPlural ? "s" : "");
  }
  return ms;
}
var common$1;
var hasRequiredCommon$1;
function requireCommon$1() {
  if (hasRequiredCommon$1) return common$1;
  hasRequiredCommon$1 = 1;
  function setup(env) {
    createDebug.debug = createDebug;
    createDebug.default = createDebug;
    createDebug.coerce = coerce;
    createDebug.disable = disable;
    createDebug.enable = enable;
    createDebug.enabled = enabled;
    createDebug.humanize = requireMs();
    createDebug.destroy = destroy;
    Object.keys(env).forEach((key) => {
      createDebug[key] = env[key];
    });
    createDebug.names = [];
    createDebug.skips = [];
    createDebug.formatters = {};
    function selectColor(namespace) {
      let hash = 0;
      for (let i = 0; i < namespace.length; i++) {
        hash = (hash << 5) - hash + namespace.charCodeAt(i);
        hash |= 0;
      }
      return createDebug.colors[Math.abs(hash) % createDebug.colors.length];
    }
    createDebug.selectColor = selectColor;
    function createDebug(namespace) {
      let prevTime;
      let enableOverride = null;
      let namespacesCache;
      let enabledCache;
      function debug(...args) {
        if (!debug.enabled) {
          return;
        }
        const self2 = debug;
        const curr = Number(/* @__PURE__ */ new Date());
        const ms2 = curr - (prevTime || curr);
        self2.diff = ms2;
        self2.prev = prevTime;
        self2.curr = curr;
        prevTime = curr;
        args[0] = createDebug.coerce(args[0]);
        if (typeof args[0] !== "string") {
          args.unshift("%O");
        }
        let index = 0;
        args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
          if (match === "%%") {
            return "%";
          }
          index++;
          const formatter = createDebug.formatters[format];
          if (typeof formatter === "function") {
            const val = args[index];
            match = formatter.call(self2, val);
            args.splice(index, 1);
            index--;
          }
          return match;
        });
        createDebug.formatArgs.call(self2, args);
        const logFn = self2.log || createDebug.log;
        logFn.apply(self2, args);
      }
      debug.namespace = namespace;
      debug.useColors = createDebug.useColors();
      debug.color = createDebug.selectColor(namespace);
      debug.extend = extend;
      debug.destroy = createDebug.destroy;
      Object.defineProperty(debug, "enabled", {
        enumerable: true,
        configurable: false,
        get: () => {
          if (enableOverride !== null) {
            return enableOverride;
          }
          if (namespacesCache !== createDebug.namespaces) {
            namespacesCache = createDebug.namespaces;
            enabledCache = createDebug.enabled(namespace);
          }
          return enabledCache;
        },
        set: (v) => {
          enableOverride = v;
        }
      });
      if (typeof createDebug.init === "function") {
        createDebug.init(debug);
      }
      return debug;
    }
    function extend(namespace, delimiter) {
      const newDebug = createDebug(this.namespace + (typeof delimiter === "undefined" ? ":" : delimiter) + namespace);
      newDebug.log = this.log;
      return newDebug;
    }
    function enable(namespaces) {
      createDebug.save(namespaces);
      createDebug.namespaces = namespaces;
      createDebug.names = [];
      createDebug.skips = [];
      const split = (typeof namespaces === "string" ? namespaces : "").trim().replace(/\s+/g, ",").split(",").filter(Boolean);
      for (const ns of split) {
        if (ns[0] === "-") {
          createDebug.skips.push(ns.slice(1));
        } else {
          createDebug.names.push(ns);
        }
      }
    }
    function matchesTemplate(search, template) {
      let searchIndex = 0;
      let templateIndex = 0;
      let starIndex = -1;
      let matchIndex = 0;
      while (searchIndex < search.length) {
        if (templateIndex < template.length && (template[templateIndex] === search[searchIndex] || template[templateIndex] === "*")) {
          if (template[templateIndex] === "*") {
            starIndex = templateIndex;
            matchIndex = searchIndex;
            templateIndex++;
          } else {
            searchIndex++;
            templateIndex++;
          }
        } else if (starIndex !== -1) {
          templateIndex = starIndex + 1;
          matchIndex++;
          searchIndex = matchIndex;
        } else {
          return false;
        }
      }
      while (templateIndex < template.length && template[templateIndex] === "*") {
        templateIndex++;
      }
      return templateIndex === template.length;
    }
    function disable() {
      const namespaces = [
        ...createDebug.names,
        ...createDebug.skips.map((namespace) => "-" + namespace)
      ].join(",");
      createDebug.enable("");
      return namespaces;
    }
    function enabled(name) {
      for (const skip of createDebug.skips) {
        if (matchesTemplate(name, skip)) {
          return false;
        }
      }
      for (const ns of createDebug.names) {
        if (matchesTemplate(name, ns)) {
          return true;
        }
      }
      return false;
    }
    function coerce(val) {
      if (val instanceof Error) {
        return val.stack || val.message;
      }
      return val;
    }
    function destroy() {
      console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
    }
    createDebug.enable(createDebug.load());
    return createDebug;
  }
  common$1 = setup;
  return common$1;
}
var hasRequiredBrowser;
function requireBrowser() {
  if (hasRequiredBrowser) return browser.exports;
  hasRequiredBrowser = 1;
  (function(module, exports) {
    exports.formatArgs = formatArgs;
    exports.save = save;
    exports.load = load;
    exports.useColors = useColors;
    exports.storage = localstorage();
    exports.destroy = /* @__PURE__ */ (() => {
      let warned = false;
      return () => {
        if (!warned) {
          warned = true;
          console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
        }
      };
    })();
    exports.colors = [
      "#0000CC",
      "#0000FF",
      "#0033CC",
      "#0033FF",
      "#0066CC",
      "#0066FF",
      "#0099CC",
      "#0099FF",
      "#00CC00",
      "#00CC33",
      "#00CC66",
      "#00CC99",
      "#00CCCC",
      "#00CCFF",
      "#3300CC",
      "#3300FF",
      "#3333CC",
      "#3333FF",
      "#3366CC",
      "#3366FF",
      "#3399CC",
      "#3399FF",
      "#33CC00",
      "#33CC33",
      "#33CC66",
      "#33CC99",
      "#33CCCC",
      "#33CCFF",
      "#6600CC",
      "#6600FF",
      "#6633CC",
      "#6633FF",
      "#66CC00",
      "#66CC33",
      "#9900CC",
      "#9900FF",
      "#9933CC",
      "#9933FF",
      "#99CC00",
      "#99CC33",
      "#CC0000",
      "#CC0033",
      "#CC0066",
      "#CC0099",
      "#CC00CC",
      "#CC00FF",
      "#CC3300",
      "#CC3333",
      "#CC3366",
      "#CC3399",
      "#CC33CC",
      "#CC33FF",
      "#CC6600",
      "#CC6633",
      "#CC9900",
      "#CC9933",
      "#CCCC00",
      "#CCCC33",
      "#FF0000",
      "#FF0033",
      "#FF0066",
      "#FF0099",
      "#FF00CC",
      "#FF00FF",
      "#FF3300",
      "#FF3333",
      "#FF3366",
      "#FF3399",
      "#FF33CC",
      "#FF33FF",
      "#FF6600",
      "#FF6633",
      "#FF9900",
      "#FF9933",
      "#FFCC00",
      "#FFCC33"
    ];
    function useColors() {
      if (typeof window !== "undefined" && window.process && (window.process.type === "renderer" || window.process.__nwjs)) {
        return true;
      }
      if (typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
        return false;
      }
      let m;
      return typeof document !== "undefined" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || // Is firebug? http://stackoverflow.com/a/398120/376773
      typeof window !== "undefined" && window.console && (window.console.firebug || window.console.exception && window.console.table) || // Is firefox >= v31?
      // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
      typeof navigator !== "undefined" && navigator.userAgent && (m = navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/)) && parseInt(m[1], 10) >= 31 || // Double check webkit in userAgent just in case we are in a worker
      typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
    }
    function formatArgs(args) {
      args[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + args[0] + (this.useColors ? "%c " : " ") + "+" + module.exports.humanize(this.diff);
      if (!this.useColors) {
        return;
      }
      const c = "color: " + this.color;
      args.splice(1, 0, c, "color: inherit");
      let index = 0;
      let lastC = 0;
      args[0].replace(/%[a-zA-Z%]/g, (match) => {
        if (match === "%%") {
          return;
        }
        index++;
        if (match === "%c") {
          lastC = index;
        }
      });
      args.splice(lastC, 0, c);
    }
    exports.log = console.debug || console.log || (() => {
    });
    function save(namespaces) {
      try {
        if (namespaces) {
          exports.storage.setItem("debug", namespaces);
        } else {
          exports.storage.removeItem("debug");
        }
      } catch (error2) {
      }
    }
    function load() {
      let r;
      try {
        r = exports.storage.getItem("debug") || exports.storage.getItem("DEBUG");
      } catch (error2) {
      }
      if (!r && typeof process !== "undefined" && "env" in process) {
        r = process.env.DEBUG;
      }
      return r;
    }
    function localstorage() {
      try {
        return localStorage;
      } catch (error2) {
      }
    }
    module.exports = requireCommon$1()(exports);
    const { formatters } = module.exports;
    formatters.j = function(v) {
      try {
        return JSON.stringify(v);
      } catch (error2) {
        return "[UnexpectedJSONParseError]: " + error2.message;
      }
    };
  })(browser, browser.exports);
  return browser.exports;
}
var node = { exports: {} };
var hasFlag;
var hasRequiredHasFlag;
function requireHasFlag() {
  if (hasRequiredHasFlag) return hasFlag;
  hasRequiredHasFlag = 1;
  hasFlag = (flag, argv = process.argv) => {
    const prefix = flag.startsWith("-") ? "" : flag.length === 1 ? "-" : "--";
    const position = argv.indexOf(prefix + flag);
    const terminatorPosition = argv.indexOf("--");
    return position !== -1 && (terminatorPosition === -1 || position < terminatorPosition);
  };
  return hasFlag;
}
var supportsColor_1;
var hasRequiredSupportsColor;
function requireSupportsColor() {
  if (hasRequiredSupportsColor) return supportsColor_1;
  hasRequiredSupportsColor = 1;
  const os = require$$2;
  const tty = require$$1$1;
  const hasFlag2 = requireHasFlag();
  const { env } = process;
  let forceColor;
  if (hasFlag2("no-color") || hasFlag2("no-colors") || hasFlag2("color=false") || hasFlag2("color=never")) {
    forceColor = 0;
  } else if (hasFlag2("color") || hasFlag2("colors") || hasFlag2("color=true") || hasFlag2("color=always")) {
    forceColor = 1;
  }
  if ("FORCE_COLOR" in env) {
    if (env.FORCE_COLOR === "true") {
      forceColor = 1;
    } else if (env.FORCE_COLOR === "false") {
      forceColor = 0;
    } else {
      forceColor = env.FORCE_COLOR.length === 0 ? 1 : Math.min(parseInt(env.FORCE_COLOR, 10), 3);
    }
  }
  function translateLevel(level) {
    if (level === 0) {
      return false;
    }
    return {
      level,
      hasBasic: true,
      has256: level >= 2,
      has16m: level >= 3
    };
  }
  function supportsColor(haveStream, streamIsTTY) {
    if (forceColor === 0) {
      return 0;
    }
    if (hasFlag2("color=16m") || hasFlag2("color=full") || hasFlag2("color=truecolor")) {
      return 3;
    }
    if (hasFlag2("color=256")) {
      return 2;
    }
    if (haveStream && !streamIsTTY && forceColor === void 0) {
      return 0;
    }
    const min = forceColor || 0;
    if (env.TERM === "dumb") {
      return min;
    }
    if (process.platform === "win32") {
      const osRelease = os.release().split(".");
      if (Number(osRelease[0]) >= 10 && Number(osRelease[2]) >= 10586) {
        return Number(osRelease[2]) >= 14931 ? 3 : 2;
      }
      return 1;
    }
    if ("CI" in env) {
      if (["TRAVIS", "CIRCLECI", "APPVEYOR", "GITLAB_CI", "GITHUB_ACTIONS", "BUILDKITE"].some((sign) => sign in env) || env.CI_NAME === "codeship") {
        return 1;
      }
      return min;
    }
    if ("TEAMCITY_VERSION" in env) {
      return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(env.TEAMCITY_VERSION) ? 1 : 0;
    }
    if (env.COLORTERM === "truecolor") {
      return 3;
    }
    if ("TERM_PROGRAM" in env) {
      const version = parseInt((env.TERM_PROGRAM_VERSION || "").split(".")[0], 10);
      switch (env.TERM_PROGRAM) {
        case "iTerm.app":
          return version >= 3 ? 3 : 2;
        case "Apple_Terminal":
          return 2;
      }
    }
    if (/-256(color)?$/i.test(env.TERM)) {
      return 2;
    }
    if (/^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(env.TERM)) {
      return 1;
    }
    if ("COLORTERM" in env) {
      return 1;
    }
    return min;
  }
  function getSupportLevel(stream) {
    const level = supportsColor(stream, stream && stream.isTTY);
    return translateLevel(level);
  }
  supportsColor_1 = {
    supportsColor: getSupportLevel,
    stdout: translateLevel(supportsColor(true, tty.isatty(1))),
    stderr: translateLevel(supportsColor(true, tty.isatty(2)))
  };
  return supportsColor_1;
}
var hasRequiredNode;
function requireNode() {
  if (hasRequiredNode) return node.exports;
  hasRequiredNode = 1;
  (function(module, exports) {
    const tty = require$$1$1;
    const util2 = require$$1;
    exports.init = init;
    exports.log = log;
    exports.formatArgs = formatArgs;
    exports.save = save;
    exports.load = load;
    exports.useColors = useColors;
    exports.destroy = util2.deprecate(
      () => {
      },
      "Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`."
    );
    exports.colors = [6, 2, 3, 4, 5, 1];
    try {
      const supportsColor = requireSupportsColor();
      if (supportsColor && (supportsColor.stderr || supportsColor).level >= 2) {
        exports.colors = [
          20,
          21,
          26,
          27,
          32,
          33,
          38,
          39,
          40,
          41,
          42,
          43,
          44,
          45,
          56,
          57,
          62,
          63,
          68,
          69,
          74,
          75,
          76,
          77,
          78,
          79,
          80,
          81,
          92,
          93,
          98,
          99,
          112,
          113,
          128,
          129,
          134,
          135,
          148,
          149,
          160,
          161,
          162,
          163,
          164,
          165,
          166,
          167,
          168,
          169,
          170,
          171,
          172,
          173,
          178,
          179,
          184,
          185,
          196,
          197,
          198,
          199,
          200,
          201,
          202,
          203,
          204,
          205,
          206,
          207,
          208,
          209,
          214,
          215,
          220,
          221
        ];
      }
    } catch (error2) {
    }
    exports.inspectOpts = Object.keys(process.env).filter((key) => {
      return /^debug_/i.test(key);
    }).reduce((obj, key) => {
      const prop = key.substring(6).toLowerCase().replace(/_([a-z])/g, (_, k) => {
        return k.toUpperCase();
      });
      let val = process.env[key];
      if (/^(yes|on|true|enabled)$/i.test(val)) {
        val = true;
      } else if (/^(no|off|false|disabled)$/i.test(val)) {
        val = false;
      } else if (val === "null") {
        val = null;
      } else {
        val = Number(val);
      }
      obj[prop] = val;
      return obj;
    }, {});
    function useColors() {
      return "colors" in exports.inspectOpts ? Boolean(exports.inspectOpts.colors) : tty.isatty(process.stderr.fd);
    }
    function formatArgs(args) {
      const { namespace: name, useColors: useColors2 } = this;
      if (useColors2) {
        const c = this.color;
        const colorCode = "\x1B[3" + (c < 8 ? c : "8;5;" + c);
        const prefix = `  ${colorCode};1m${name} \x1B[0m`;
        args[0] = prefix + args[0].split("\n").join("\n" + prefix);
        args.push(colorCode + "m+" + module.exports.humanize(this.diff) + "\x1B[0m");
      } else {
        args[0] = getDate() + name + " " + args[0];
      }
    }
    function getDate() {
      if (exports.inspectOpts.hideDate) {
        return "";
      }
      return (/* @__PURE__ */ new Date()).toISOString() + " ";
    }
    function log(...args) {
      return process.stderr.write(util2.formatWithOptions(exports.inspectOpts, ...args) + "\n");
    }
    function save(namespaces) {
      if (namespaces) {
        process.env.DEBUG = namespaces;
      } else {
        delete process.env.DEBUG;
      }
    }
    function load() {
      return process.env.DEBUG;
    }
    function init(debug) {
      debug.inspectOpts = {};
      const keys = Object.keys(exports.inspectOpts);
      for (let i = 0; i < keys.length; i++) {
        debug.inspectOpts[keys[i]] = exports.inspectOpts[keys[i]];
      }
    }
    module.exports = requireCommon$1()(exports);
    const { formatters } = module.exports;
    formatters.o = function(v) {
      this.inspectOpts.colors = this.useColors;
      return util2.inspect(v, this.inspectOpts).split("\n").map((str2) => str2.trim()).join(" ");
    };
    formatters.O = function(v) {
      this.inspectOpts.colors = this.useColors;
      return util2.inspect(v, this.inspectOpts);
    };
  })(node, node.exports);
  return node.exports;
}
var hasRequiredSrc;
function requireSrc() {
  if (hasRequiredSrc) return src.exports;
  hasRequiredSrc = 1;
  if (typeof process === "undefined" || process.type === "renderer" || process.browser === true || process.__nwjs) {
    src.exports = requireBrowser();
  } else {
    src.exports = requireNode();
  }
  return src.exports;
}
var ProgressCallbackTransform = {};
var hasRequiredProgressCallbackTransform;
function requireProgressCallbackTransform() {
  if (hasRequiredProgressCallbackTransform) return ProgressCallbackTransform;
  hasRequiredProgressCallbackTransform = 1;
  Object.defineProperty(ProgressCallbackTransform, "__esModule", { value: true });
  ProgressCallbackTransform.ProgressCallbackTransform = void 0;
  const stream_1 = require$$0$1;
  let ProgressCallbackTransform$1 = class ProgressCallbackTransform extends stream_1.Transform {
    constructor(total, cancellationToken, onProgress) {
      super();
      this.total = total;
      this.cancellationToken = cancellationToken;
      this.onProgress = onProgress;
      this.start = Date.now();
      this.transferred = 0;
      this.delta = 0;
      this.nextUpdate = this.start + 1e3;
    }
    _transform(chunk, encoding, callback) {
      if (this.cancellationToken.cancelled) {
        callback(new Error("cancelled"), null);
        return;
      }
      this.transferred += chunk.length;
      this.delta += chunk.length;
      const now = Date.now();
      if (now >= this.nextUpdate && this.transferred !== this.total) {
        this.nextUpdate = now + 1e3;
        this.onProgress({
          total: this.total,
          delta: this.delta,
          transferred: this.transferred,
          percent: this.transferred / this.total * 100,
          bytesPerSecond: Math.round(this.transferred / ((now - this.start) / 1e3))
        });
        this.delta = 0;
      }
      callback(null, chunk);
    }
    _flush(callback) {
      if (this.cancellationToken.cancelled) {
        callback(new Error("cancelled"));
        return;
      }
      this.onProgress({
        total: this.total,
        delta: this.delta,
        transferred: this.total,
        percent: 100,
        bytesPerSecond: Math.round(this.transferred / ((Date.now() - this.start) / 1e3))
      });
      this.delta = 0;
      callback(null);
    }
  };
  ProgressCallbackTransform.ProgressCallbackTransform = ProgressCallbackTransform$1;
  return ProgressCallbackTransform;
}
var hasRequiredHttpExecutor;
function requireHttpExecutor() {
  if (hasRequiredHttpExecutor) return httpExecutor;
  hasRequiredHttpExecutor = 1;
  Object.defineProperty(httpExecutor, "__esModule", { value: true });
  httpExecutor.DigestTransform = httpExecutor.HttpExecutor = httpExecutor.HttpError = void 0;
  httpExecutor.createHttpError = createHttpError;
  httpExecutor.parseJson = parseJson;
  httpExecutor.configureRequestOptionsFromUrl = configureRequestOptionsFromUrl;
  httpExecutor.configureRequestUrl = configureRequestUrl;
  httpExecutor.safeGetHeader = safeGetHeader;
  httpExecutor.configureRequestOptions = configureRequestOptions;
  httpExecutor.safeStringifyJson = safeStringifyJson;
  const crypto_1 = require$$0$3;
  const debug_12 = requireSrc();
  const fs_1 = fs$1;
  const stream_1 = require$$0$1;
  const url_1 = require$$4;
  const CancellationToken_1 = requireCancellationToken();
  const error_1 = requireError();
  const ProgressCallbackTransform_1 = requireProgressCallbackTransform();
  const debug = (0, debug_12.default)("electron-builder");
  function createHttpError(response, description = null) {
    return new HttpError(response.statusCode || -1, `${response.statusCode} ${response.statusMessage}` + (description == null ? "" : "\n" + JSON.stringify(description, null, "  ")) + "\nHeaders: " + safeStringifyJson(response.headers), description);
  }
  const HTTP_STATUS_CODES = /* @__PURE__ */ new Map([
    [429, "Too many requests"],
    [400, "Bad request"],
    [403, "Forbidden"],
    [404, "Not found"],
    [405, "Method not allowed"],
    [406, "Not acceptable"],
    [408, "Request timeout"],
    [413, "Request entity too large"],
    [500, "Internal server error"],
    [502, "Bad gateway"],
    [503, "Service unavailable"],
    [504, "Gateway timeout"],
    [505, "HTTP version not supported"]
  ]);
  class HttpError extends Error {
    constructor(statusCode, message = `HTTP error: ${HTTP_STATUS_CODES.get(statusCode) || statusCode}`, description = null) {
      super(message);
      this.statusCode = statusCode;
      this.description = description;
      this.name = "HttpError";
      this.code = `HTTP_ERROR_${statusCode}`;
    }
    isServerError() {
      return this.statusCode >= 500 && this.statusCode <= 599;
    }
  }
  httpExecutor.HttpError = HttpError;
  function parseJson(result) {
    return result.then((it) => it == null || it.length === 0 ? null : JSON.parse(it));
  }
  class HttpExecutor {
    constructor() {
      this.maxRedirects = 10;
    }
    request(options, cancellationToken = new CancellationToken_1.CancellationToken(), data) {
      configureRequestOptions(options);
      const json2 = data == null ? void 0 : JSON.stringify(data);
      const encodedData = json2 ? Buffer.from(json2) : void 0;
      if (encodedData != null) {
        debug(json2);
        const { headers, ...opts } = options;
        options = {
          method: "post",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": encodedData.length,
            ...headers
          },
          ...opts
        };
      }
      return this.doApiRequest(options, cancellationToken, (it) => it.end(encodedData));
    }
    doApiRequest(options, cancellationToken, requestProcessor, redirectCount = 0) {
      if (debug.enabled) {
        debug(`Request: ${safeStringifyJson(options)}`);
      }
      return cancellationToken.createPromise((resolve, reject, onCancel) => {
        const request = this.createRequest(options, (response) => {
          try {
            this.handleResponse(response, options, cancellationToken, resolve, reject, redirectCount, requestProcessor);
          } catch (e) {
            reject(e);
          }
        });
        this.addErrorAndTimeoutHandlers(request, reject, options.timeout);
        this.addRedirectHandlers(request, options, reject, redirectCount, (options2) => {
          this.doApiRequest(options2, cancellationToken, requestProcessor, redirectCount).then(resolve).catch(reject);
        });
        requestProcessor(request, reject);
        onCancel(() => request.abort());
      });
    }
    // noinspection JSUnusedLocalSymbols
    // eslint-disable-next-line
    addRedirectHandlers(request, options, reject, redirectCount, handler) {
    }
    addErrorAndTimeoutHandlers(request, reject, timeout = 60 * 1e3) {
      this.addTimeOutHandler(request, reject, timeout);
      request.on("error", reject);
      request.on("aborted", () => {
        reject(new Error("Request has been aborted by the server"));
      });
    }
    handleResponse(response, options, cancellationToken, resolve, reject, redirectCount, requestProcessor) {
      var _a;
      if (debug.enabled) {
        debug(`Response: ${response.statusCode} ${response.statusMessage}, request options: ${safeStringifyJson(options)}`);
      }
      if (response.statusCode === 404) {
        reject(createHttpError(response, `method: ${options.method || "GET"} url: ${options.protocol || "https:"}//${options.hostname}${options.port ? `:${options.port}` : ""}${options.path}

Please double check that your authentication token is correct. Due to security reasons, actual status maybe not reported, but 404.
`));
        return;
      } else if (response.statusCode === 204) {
        resolve();
        return;
      }
      const code = (_a = response.statusCode) !== null && _a !== void 0 ? _a : 0;
      const shouldRedirect = code >= 300 && code < 400;
      const redirectUrl = safeGetHeader(response, "location");
      if (shouldRedirect && redirectUrl != null) {
        if (redirectCount > this.maxRedirects) {
          reject(this.createMaxRedirectError());
          return;
        }
        this.doApiRequest(HttpExecutor.prepareRedirectUrlOptions(redirectUrl, options), cancellationToken, requestProcessor, redirectCount).then(resolve).catch(reject);
        return;
      }
      response.setEncoding("utf8");
      let data = "";
      response.on("error", reject);
      response.on("data", (chunk) => data += chunk);
      response.on("end", () => {
        try {
          if (response.statusCode != null && response.statusCode >= 400) {
            const contentType = safeGetHeader(response, "content-type");
            const isJson = contentType != null && (Array.isArray(contentType) ? contentType.find((it) => it.includes("json")) != null : contentType.includes("json"));
            reject(createHttpError(response, `method: ${options.method || "GET"} url: ${options.protocol || "https:"}//${options.hostname}${options.port ? `:${options.port}` : ""}${options.path}

          Data:
          ${isJson ? JSON.stringify(JSON.parse(data)) : data}
          `));
          } else {
            resolve(data.length === 0 ? null : data);
          }
        } catch (e) {
          reject(e);
        }
      });
    }
    async downloadToBuffer(url, options) {
      return await options.cancellationToken.createPromise((resolve, reject, onCancel) => {
        const responseChunks = [];
        const requestOptions = {
          headers: options.headers || void 0,
          // because PrivateGitHubProvider requires HttpExecutor.prepareRedirectUrlOptions logic, so, we need to redirect manually
          redirect: "manual"
        };
        configureRequestUrl(url, requestOptions);
        configureRequestOptions(requestOptions);
        this.doDownload(requestOptions, {
          destination: null,
          options,
          onCancel,
          callback: (error2) => {
            if (error2 == null) {
              resolve(Buffer.concat(responseChunks));
            } else {
              reject(error2);
            }
          },
          responseHandler: (response, callback) => {
            let receivedLength = 0;
            response.on("data", (chunk) => {
              receivedLength += chunk.length;
              if (receivedLength > 524288e3) {
                callback(new Error("Maximum allowed size is 500 MB"));
                return;
              }
              responseChunks.push(chunk);
            });
            response.on("end", () => {
              callback(null);
            });
          }
        }, 0);
      });
    }
    doDownload(requestOptions, options, redirectCount) {
      const request = this.createRequest(requestOptions, (response) => {
        if (response.statusCode >= 400) {
          options.callback(new Error(`Cannot download "${requestOptions.protocol || "https:"}//${requestOptions.hostname}${requestOptions.path}", status ${response.statusCode}: ${response.statusMessage}`));
          return;
        }
        response.on("error", options.callback);
        const redirectUrl = safeGetHeader(response, "location");
        if (redirectUrl != null) {
          if (redirectCount < this.maxRedirects) {
            this.doDownload(HttpExecutor.prepareRedirectUrlOptions(redirectUrl, requestOptions), options, redirectCount++);
          } else {
            options.callback(this.createMaxRedirectError());
          }
          return;
        }
        if (options.responseHandler == null) {
          configurePipes(options, response);
        } else {
          options.responseHandler(response, options.callback);
        }
      });
      this.addErrorAndTimeoutHandlers(request, options.callback, requestOptions.timeout);
      this.addRedirectHandlers(request, requestOptions, options.callback, redirectCount, (requestOptions2) => {
        this.doDownload(requestOptions2, options, redirectCount++);
      });
      request.end();
    }
    createMaxRedirectError() {
      return new Error(`Too many redirects (> ${this.maxRedirects})`);
    }
    addTimeOutHandler(request, callback, timeout) {
      request.on("socket", (socket) => {
        socket.setTimeout(timeout, () => {
          request.abort();
          callback(new Error("Request timed out"));
        });
      });
    }
    static prepareRedirectUrlOptions(redirectUrl, options) {
      const newOptions = configureRequestOptionsFromUrl(redirectUrl, { ...options });
      const headers = newOptions.headers;
      if (headers === null || headers === void 0 ? void 0 : headers.authorization) {
        const parsedNewUrl = new url_1.URL(redirectUrl);
        if (parsedNewUrl.hostname.endsWith(".amazonaws.com") || parsedNewUrl.searchParams.has("X-Amz-Credential")) {
          delete headers.authorization;
        }
      }
      return newOptions;
    }
    static retryOnServerError(task, maxRetries = 3) {
      for (let attemptNumber = 0; ; attemptNumber++) {
        try {
          return task();
        } catch (e) {
          if (attemptNumber < maxRetries && (e instanceof HttpError && e.isServerError() || e.code === "EPIPE")) {
            continue;
          }
          throw e;
        }
      }
    }
  }
  httpExecutor.HttpExecutor = HttpExecutor;
  function configureRequestOptionsFromUrl(url, options) {
    const result = configureRequestOptions(options);
    configureRequestUrl(new url_1.URL(url), result);
    return result;
  }
  function configureRequestUrl(url, options) {
    options.protocol = url.protocol;
    options.hostname = url.hostname;
    if (url.port) {
      options.port = url.port;
    } else if (options.port) {
      delete options.port;
    }
    options.path = url.pathname + url.search;
  }
  class DigestTransform extends stream_1.Transform {
    // noinspection JSUnusedGlobalSymbols
    get actual() {
      return this._actual;
    }
    constructor(expected, algorithm = "sha512", encoding = "base64") {
      super();
      this.expected = expected;
      this.algorithm = algorithm;
      this.encoding = encoding;
      this._actual = null;
      this.isValidateOnEnd = true;
      this.digester = (0, crypto_1.createHash)(algorithm);
    }
    // noinspection JSUnusedGlobalSymbols
    _transform(chunk, encoding, callback) {
      this.digester.update(chunk);
      callback(null, chunk);
    }
    // noinspection JSUnusedGlobalSymbols
    _flush(callback) {
      this._actual = this.digester.digest(this.encoding);
      if (this.isValidateOnEnd) {
        try {
          this.validate();
        } catch (e) {
          callback(e);
          return;
        }
      }
      callback(null);
    }
    validate() {
      if (this._actual == null) {
        throw (0, error_1.newError)("Not finished yet", "ERR_STREAM_NOT_FINISHED");
      }
      if (this._actual !== this.expected) {
        throw (0, error_1.newError)(`${this.algorithm} checksum mismatch, expected ${this.expected}, got ${this._actual}`, "ERR_CHECKSUM_MISMATCH");
      }
      return null;
    }
  }
  httpExecutor.DigestTransform = DigestTransform;
  function checkSha2(sha2Header, sha2, callback) {
    if (sha2Header != null && sha2 != null && sha2Header !== sha2) {
      callback(new Error(`checksum mismatch: expected ${sha2} but got ${sha2Header} (X-Checksum-Sha2 header)`));
      return false;
    }
    return true;
  }
  function safeGetHeader(response, headerKey) {
    const value = response.headers[headerKey];
    if (value == null) {
      return null;
    } else if (Array.isArray(value)) {
      return value.length === 0 ? null : value[value.length - 1];
    } else {
      return value;
    }
  }
  function configurePipes(options, response) {
    if (!checkSha2(safeGetHeader(response, "X-Checksum-Sha2"), options.options.sha2, options.callback)) {
      return;
    }
    const streams = [];
    if (options.options.onProgress != null) {
      const contentLength = safeGetHeader(response, "content-length");
      if (contentLength != null) {
        streams.push(new ProgressCallbackTransform_1.ProgressCallbackTransform(parseInt(contentLength, 10), options.options.cancellationToken, options.options.onProgress));
      }
    }
    const sha512 = options.options.sha512;
    if (sha512 != null) {
      streams.push(new DigestTransform(sha512, "sha512", sha512.length === 128 && !sha512.includes("+") && !sha512.includes("Z") && !sha512.includes("=") ? "hex" : "base64"));
    } else if (options.options.sha2 != null) {
      streams.push(new DigestTransform(options.options.sha2, "sha256", "hex"));
    }
    const fileOut = (0, fs_1.createWriteStream)(options.destination);
    streams.push(fileOut);
    let lastStream = response;
    for (const stream of streams) {
      stream.on("error", (error2) => {
        fileOut.close();
        if (!options.options.cancellationToken.cancelled) {
          options.callback(error2);
        }
      });
      lastStream = lastStream.pipe(stream);
    }
    fileOut.on("finish", () => {
      fileOut.close(options.callback);
    });
  }
  function configureRequestOptions(options, token, method) {
    if (method != null) {
      options.method = method;
    }
    options.headers = { ...options.headers };
    const headers = options.headers;
    if (token != null) {
      headers.authorization = token.startsWith("Basic") || token.startsWith("Bearer") ? token : `token ${token}`;
    }
    if (headers["User-Agent"] == null) {
      headers["User-Agent"] = "electron-builder";
    }
    if (method == null || method === "GET" || headers["Cache-Control"] == null) {
      headers["Cache-Control"] = "no-cache";
    }
    if (options.protocol == null && process.versions.electron != null) {
      options.protocol = "https:";
    }
    return options;
  }
  function safeStringifyJson(data, skippedNames) {
    return JSON.stringify(data, (name, value) => {
      if (name.endsWith("Authorization") || name.endsWith("authorization") || name.endsWith("Password") || name.endsWith("PASSWORD") || name.endsWith("Token") || name.includes("password") || name.includes("token") || skippedNames != null && skippedNames.has(name)) {
        return "<stripped sensitive data>";
      }
      return value;
    }, 2);
  }
  return httpExecutor;
}
var MemoLazy = {};
var hasRequiredMemoLazy;
function requireMemoLazy() {
  if (hasRequiredMemoLazy) return MemoLazy;
  hasRequiredMemoLazy = 1;
  Object.defineProperty(MemoLazy, "__esModule", { value: true });
  MemoLazy.MemoLazy = void 0;
  let MemoLazy$1 = class MemoLazy {
    constructor(selector, creator) {
      this.selector = selector;
      this.creator = creator;
      this.selected = void 0;
      this._value = void 0;
    }
    get hasValue() {
      return this._value !== void 0;
    }
    get value() {
      const selected = this.selector();
      if (this._value !== void 0 && equals(this.selected, selected)) {
        return this._value;
      }
      this.selected = selected;
      const result = this.creator(selected);
      this.value = result;
      return result;
    }
    set value(value) {
      this._value = value;
    }
  };
  MemoLazy.MemoLazy = MemoLazy$1;
  function equals(firstValue, secondValue) {
    const isFirstObject = typeof firstValue === "object" && firstValue !== null;
    const isSecondObject = typeof secondValue === "object" && secondValue !== null;
    if (isFirstObject && isSecondObject) {
      const keys1 = Object.keys(firstValue);
      const keys2 = Object.keys(secondValue);
      return keys1.length === keys2.length && keys1.every((key) => equals(firstValue[key], secondValue[key]));
    }
    return firstValue === secondValue;
  }
  return MemoLazy;
}
var publishOptions = {};
var hasRequiredPublishOptions;
function requirePublishOptions() {
  if (hasRequiredPublishOptions) return publishOptions;
  hasRequiredPublishOptions = 1;
  Object.defineProperty(publishOptions, "__esModule", { value: true });
  publishOptions.githubUrl = githubUrl;
  publishOptions.getS3LikeProviderBaseUrl = getS3LikeProviderBaseUrl;
  function githubUrl(options, defaultHost = "github.com") {
    return `${options.protocol || "https"}://${options.host || defaultHost}`;
  }
  function getS3LikeProviderBaseUrl(configuration) {
    const provider = configuration.provider;
    if (provider === "s3") {
      return s3Url(configuration);
    }
    if (provider === "spaces") {
      return spacesUrl(configuration);
    }
    throw new Error(`Not supported provider: ${provider}`);
  }
  function s3Url(options) {
    let url;
    if (options.accelerate == true) {
      url = `https://${options.bucket}.s3-accelerate.amazonaws.com`;
    } else if (options.endpoint != null) {
      url = `${options.endpoint}/${options.bucket}`;
    } else if (options.bucket.includes(".")) {
      if (options.region == null) {
        throw new Error(`Bucket name "${options.bucket}" includes a dot, but S3 region is missing`);
      }
      if (options.region === "us-east-1") {
        url = `https://s3.amazonaws.com/${options.bucket}`;
      } else {
        url = `https://s3-${options.region}.amazonaws.com/${options.bucket}`;
      }
    } else if (options.region === "cn-north-1") {
      url = `https://${options.bucket}.s3.${options.region}.amazonaws.com.cn`;
    } else {
      url = `https://${options.bucket}.s3.amazonaws.com`;
    }
    return appendPath(url, options.path);
  }
  function appendPath(url, p) {
    if (p != null && p.length > 0) {
      if (!p.startsWith("/")) {
        url += "/";
      }
      url += p;
    }
    return url;
  }
  function spacesUrl(options) {
    if (options.name == null) {
      throw new Error(`name is missing`);
    }
    if (options.region == null) {
      throw new Error(`region is missing`);
    }
    return appendPath(`https://${options.name}.${options.region}.digitaloceanspaces.com`, options.path);
  }
  return publishOptions;
}
var retry = {};
var hasRequiredRetry;
function requireRetry() {
  if (hasRequiredRetry) return retry;
  hasRequiredRetry = 1;
  Object.defineProperty(retry, "__esModule", { value: true });
  retry.retry = retry$1;
  const CancellationToken_1 = requireCancellationToken();
  async function retry$1(task, retryCount, interval, backoff = 0, attempt = 0, shouldRetry) {
    var _a;
    const cancellationToken = new CancellationToken_1.CancellationToken();
    try {
      return await task();
    } catch (error2) {
      if (((_a = shouldRetry === null || shouldRetry === void 0 ? void 0 : shouldRetry(error2)) !== null && _a !== void 0 ? _a : true) && retryCount > 0 && !cancellationToken.cancelled) {
        await new Promise((resolve) => setTimeout(resolve, interval + backoff * attempt));
        return await retry$1(task, retryCount - 1, interval, backoff, attempt + 1, shouldRetry);
      } else {
        throw error2;
      }
    }
  }
  return retry;
}
var rfc2253Parser = {};
var hasRequiredRfc2253Parser;
function requireRfc2253Parser() {
  if (hasRequiredRfc2253Parser) return rfc2253Parser;
  hasRequiredRfc2253Parser = 1;
  Object.defineProperty(rfc2253Parser, "__esModule", { value: true });
  rfc2253Parser.parseDn = parseDn;
  function parseDn(seq2) {
    let quoted = false;
    let key = null;
    let token = "";
    let nextNonSpace = 0;
    seq2 = seq2.trim();
    const result = /* @__PURE__ */ new Map();
    for (let i = 0; i <= seq2.length; i++) {
      if (i === seq2.length) {
        if (key !== null) {
          result.set(key, token);
        }
        break;
      }
      const ch = seq2[i];
      if (quoted) {
        if (ch === '"') {
          quoted = false;
          continue;
        }
      } else {
        if (ch === '"') {
          quoted = true;
          continue;
        }
        if (ch === "\\") {
          i++;
          const ord = parseInt(seq2.slice(i, i + 2), 16);
          if (Number.isNaN(ord)) {
            token += seq2[i];
          } else {
            i++;
            token += String.fromCharCode(ord);
          }
          continue;
        }
        if (key === null && ch === "=") {
          key = token;
          token = "";
          continue;
        }
        if (ch === "," || ch === ";" || ch === "+") {
          if (key !== null) {
            result.set(key, token);
          }
          key = null;
          token = "";
          continue;
        }
      }
      if (ch === " " && !quoted) {
        if (token.length === 0) {
          continue;
        }
        if (i > nextNonSpace) {
          let j = i;
          while (seq2[j] === " ") {
            j++;
          }
          nextNonSpace = j;
        }
        if (nextNonSpace >= seq2.length || seq2[nextNonSpace] === "," || seq2[nextNonSpace] === ";" || key === null && seq2[nextNonSpace] === "=" || key !== null && seq2[nextNonSpace] === "+") {
          i = nextNonSpace - 1;
          continue;
        }
      }
      token += ch;
    }
    return result;
  }
  return rfc2253Parser;
}
var uuid = {};
var hasRequiredUuid;
function requireUuid() {
  if (hasRequiredUuid) return uuid;
  hasRequiredUuid = 1;
  Object.defineProperty(uuid, "__esModule", { value: true });
  uuid.nil = uuid.UUID = void 0;
  const crypto_1 = require$$0$3;
  const error_1 = requireError();
  const invalidName = "options.name must be either a string or a Buffer";
  const randomHost = (0, crypto_1.randomBytes)(16);
  randomHost[0] = randomHost[0] | 1;
  const hex2byte = {};
  const byte2hex = [];
  for (let i = 0; i < 256; i++) {
    const hex = (i + 256).toString(16).substr(1);
    hex2byte[hex] = i;
    byte2hex[i] = hex;
  }
  class UUID {
    constructor(uuid2) {
      this.ascii = null;
      this.binary = null;
      const check = UUID.check(uuid2);
      if (!check) {
        throw new Error("not a UUID");
      }
      this.version = check.version;
      if (check.format === "ascii") {
        this.ascii = uuid2;
      } else {
        this.binary = uuid2;
      }
    }
    static v5(name, namespace) {
      return uuidNamed(name, "sha1", 80, namespace);
    }
    toString() {
      if (this.ascii == null) {
        this.ascii = stringify(this.binary);
      }
      return this.ascii;
    }
    inspect() {
      return `UUID v${this.version} ${this.toString()}`;
    }
    static check(uuid2, offset = 0) {
      if (typeof uuid2 === "string") {
        uuid2 = uuid2.toLowerCase();
        if (!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-([a-f0-9]{12})$/.test(uuid2)) {
          return false;
        }
        if (uuid2 === "00000000-0000-0000-0000-000000000000") {
          return { version: void 0, variant: "nil", format: "ascii" };
        }
        return {
          version: (hex2byte[uuid2[14] + uuid2[15]] & 240) >> 4,
          variant: getVariant((hex2byte[uuid2[19] + uuid2[20]] & 224) >> 5),
          format: "ascii"
        };
      }
      if (Buffer.isBuffer(uuid2)) {
        if (uuid2.length < offset + 16) {
          return false;
        }
        let i = 0;
        for (; i < 16; i++) {
          if (uuid2[offset + i] !== 0) {
            break;
          }
        }
        if (i === 16) {
          return { version: void 0, variant: "nil", format: "binary" };
        }
        return {
          version: (uuid2[offset + 6] & 240) >> 4,
          variant: getVariant((uuid2[offset + 8] & 224) >> 5),
          format: "binary"
        };
      }
      throw (0, error_1.newError)("Unknown type of uuid", "ERR_UNKNOWN_UUID_TYPE");
    }
    // read stringified uuid into a Buffer
    static parse(input) {
      const buffer = Buffer.allocUnsafe(16);
      let j = 0;
      for (let i = 0; i < 16; i++) {
        buffer[i] = hex2byte[input[j++] + input[j++]];
        if (i === 3 || i === 5 || i === 7 || i === 9) {
          j += 1;
        }
      }
      return buffer;
    }
  }
  uuid.UUID = UUID;
  UUID.OID = UUID.parse("6ba7b812-9dad-11d1-80b4-00c04fd430c8");
  function getVariant(bits) {
    switch (bits) {
      case 0:
      case 1:
      case 3:
        return "ncs";
      case 4:
      case 5:
        return "rfc4122";
      case 6:
        return "microsoft";
      default:
        return "future";
    }
  }
  var UuidEncoding;
  (function(UuidEncoding2) {
    UuidEncoding2[UuidEncoding2["ASCII"] = 0] = "ASCII";
    UuidEncoding2[UuidEncoding2["BINARY"] = 1] = "BINARY";
    UuidEncoding2[UuidEncoding2["OBJECT"] = 2] = "OBJECT";
  })(UuidEncoding || (UuidEncoding = {}));
  function uuidNamed(name, hashMethod, version, namespace, encoding = UuidEncoding.ASCII) {
    const hash = (0, crypto_1.createHash)(hashMethod);
    const nameIsNotAString = typeof name !== "string";
    if (nameIsNotAString && !Buffer.isBuffer(name)) {
      throw (0, error_1.newError)(invalidName, "ERR_INVALID_UUID_NAME");
    }
    hash.update(namespace);
    hash.update(name);
    const buffer = hash.digest();
    let result;
    switch (encoding) {
      case UuidEncoding.BINARY:
        buffer[6] = buffer[6] & 15 | version;
        buffer[8] = buffer[8] & 63 | 128;
        result = buffer;
        break;
      case UuidEncoding.OBJECT:
        buffer[6] = buffer[6] & 15 | version;
        buffer[8] = buffer[8] & 63 | 128;
        result = new UUID(buffer);
        break;
      default:
        result = byte2hex[buffer[0]] + byte2hex[buffer[1]] + byte2hex[buffer[2]] + byte2hex[buffer[3]] + "-" + byte2hex[buffer[4]] + byte2hex[buffer[5]] + "-" + byte2hex[buffer[6] & 15 | version] + byte2hex[buffer[7]] + "-" + byte2hex[buffer[8] & 63 | 128] + byte2hex[buffer[9]] + "-" + byte2hex[buffer[10]] + byte2hex[buffer[11]] + byte2hex[buffer[12]] + byte2hex[buffer[13]] + byte2hex[buffer[14]] + byte2hex[buffer[15]];
        break;
    }
    return result;
  }
  function stringify(buffer) {
    return byte2hex[buffer[0]] + byte2hex[buffer[1]] + byte2hex[buffer[2]] + byte2hex[buffer[3]] + "-" + byte2hex[buffer[4]] + byte2hex[buffer[5]] + "-" + byte2hex[buffer[6]] + byte2hex[buffer[7]] + "-" + byte2hex[buffer[8]] + byte2hex[buffer[9]] + "-" + byte2hex[buffer[10]] + byte2hex[buffer[11]] + byte2hex[buffer[12]] + byte2hex[buffer[13]] + byte2hex[buffer[14]] + byte2hex[buffer[15]];
  }
  uuid.nil = new UUID("00000000-0000-0000-0000-000000000000");
  return uuid;
}
var xml = {};
var sax = {};
var hasRequiredSax;
function requireSax() {
  if (hasRequiredSax) return sax;
  hasRequiredSax = 1;
  (function(exports) {
    (function(sax2) {
      sax2.parser = function(strict, opt) {
        return new SAXParser(strict, opt);
      };
      sax2.SAXParser = SAXParser;
      sax2.SAXStream = SAXStream;
      sax2.createStream = createStream;
      sax2.MAX_BUFFER_LENGTH = 64 * 1024;
      var buffers = [
        "comment",
        "sgmlDecl",
        "textNode",
        "tagName",
        "doctype",
        "procInstName",
        "procInstBody",
        "entity",
        "attribName",
        "attribValue",
        "cdata",
        "script"
      ];
      sax2.EVENTS = [
        "text",
        "processinginstruction",
        "sgmldeclaration",
        "doctype",
        "comment",
        "opentagstart",
        "attribute",
        "opentag",
        "closetag",
        "opencdata",
        "cdata",
        "closecdata",
        "error",
        "end",
        "ready",
        "script",
        "opennamespace",
        "closenamespace"
      ];
      function SAXParser(strict, opt) {
        if (!(this instanceof SAXParser)) {
          return new SAXParser(strict, opt);
        }
        var parser = this;
        clearBuffers(parser);
        parser.q = parser.c = "";
        parser.bufferCheckPosition = sax2.MAX_BUFFER_LENGTH;
        parser.opt = opt || {};
        parser.opt.lowercase = parser.opt.lowercase || parser.opt.lowercasetags;
        parser.looseCase = parser.opt.lowercase ? "toLowerCase" : "toUpperCase";
        parser.tags = [];
        parser.closed = parser.closedRoot = parser.sawRoot = false;
        parser.tag = parser.error = null;
        parser.strict = !!strict;
        parser.noscript = !!(strict || parser.opt.noscript);
        parser.state = S.BEGIN;
        parser.strictEntities = parser.opt.strictEntities;
        parser.ENTITIES = parser.strictEntities ? Object.create(sax2.XML_ENTITIES) : Object.create(sax2.ENTITIES);
        parser.attribList = [];
        if (parser.opt.xmlns) {
          parser.ns = Object.create(rootNS);
        }
        if (parser.opt.unquotedAttributeValues === void 0) {
          parser.opt.unquotedAttributeValues = !strict;
        }
        parser.trackPosition = parser.opt.position !== false;
        if (parser.trackPosition) {
          parser.position = parser.line = parser.column = 0;
        }
        emit(parser, "onready");
      }
      if (!Object.create) {
        Object.create = function(o) {
          function F() {
          }
          F.prototype = o;
          var newf = new F();
          return newf;
        };
      }
      if (!Object.keys) {
        Object.keys = function(o) {
          var a = [];
          for (var i in o) if (o.hasOwnProperty(i)) a.push(i);
          return a;
        };
      }
      function checkBufferLength(parser) {
        var maxAllowed = Math.max(sax2.MAX_BUFFER_LENGTH, 10);
        var maxActual = 0;
        for (var i = 0, l = buffers.length; i < l; i++) {
          var len = parser[buffers[i]].length;
          if (len > maxAllowed) {
            switch (buffers[i]) {
              case "textNode":
                closeText(parser);
                break;
              case "cdata":
                emitNode(parser, "oncdata", parser.cdata);
                parser.cdata = "";
                break;
              case "script":
                emitNode(parser, "onscript", parser.script);
                parser.script = "";
                break;
              default:
                error2(parser, "Max buffer length exceeded: " + buffers[i]);
            }
          }
          maxActual = Math.max(maxActual, len);
        }
        var m = sax2.MAX_BUFFER_LENGTH - maxActual;
        parser.bufferCheckPosition = m + parser.position;
      }
      function clearBuffers(parser) {
        for (var i = 0, l = buffers.length; i < l; i++) {
          parser[buffers[i]] = "";
        }
      }
      function flushBuffers(parser) {
        closeText(parser);
        if (parser.cdata !== "") {
          emitNode(parser, "oncdata", parser.cdata);
          parser.cdata = "";
        }
        if (parser.script !== "") {
          emitNode(parser, "onscript", parser.script);
          parser.script = "";
        }
      }
      SAXParser.prototype = {
        end: function() {
          end(this);
        },
        write,
        resume: function() {
          this.error = null;
          return this;
        },
        close: function() {
          return this.write(null);
        },
        flush: function() {
          flushBuffers(this);
        }
      };
      var Stream;
      try {
        Stream = require("stream").Stream;
      } catch (ex) {
        Stream = function() {
        };
      }
      if (!Stream) Stream = function() {
      };
      var streamWraps = sax2.EVENTS.filter(function(ev) {
        return ev !== "error" && ev !== "end";
      });
      function createStream(strict, opt) {
        return new SAXStream(strict, opt);
      }
      function SAXStream(strict, opt) {
        if (!(this instanceof SAXStream)) {
          return new SAXStream(strict, opt);
        }
        Stream.apply(this);
        this._parser = new SAXParser(strict, opt);
        this.writable = true;
        this.readable = true;
        var me = this;
        this._parser.onend = function() {
          me.emit("end");
        };
        this._parser.onerror = function(er) {
          me.emit("error", er);
          me._parser.error = null;
        };
        this._decoder = null;
        streamWraps.forEach(function(ev) {
          Object.defineProperty(me, "on" + ev, {
            get: function() {
              return me._parser["on" + ev];
            },
            set: function(h) {
              if (!h) {
                me.removeAllListeners(ev);
                me._parser["on" + ev] = h;
                return h;
              }
              me.on(ev, h);
            },
            enumerable: true,
            configurable: false
          });
        });
      }
      SAXStream.prototype = Object.create(Stream.prototype, {
        constructor: {
          value: SAXStream
        }
      });
      SAXStream.prototype.write = function(data) {
        if (typeof Buffer === "function" && typeof Buffer.isBuffer === "function" && Buffer.isBuffer(data)) {
          if (!this._decoder) {
            var SD = require$$1$2.StringDecoder;
            this._decoder = new SD("utf8");
          }
          data = this._decoder.write(data);
        }
        this._parser.write(data.toString());
        this.emit("data", data);
        return true;
      };
      SAXStream.prototype.end = function(chunk) {
        if (chunk && chunk.length) {
          this.write(chunk);
        }
        this._parser.end();
        return true;
      };
      SAXStream.prototype.on = function(ev, handler) {
        var me = this;
        if (!me._parser["on" + ev] && streamWraps.indexOf(ev) !== -1) {
          me._parser["on" + ev] = function() {
            var args = arguments.length === 1 ? [arguments[0]] : Array.apply(null, arguments);
            args.splice(0, 0, ev);
            me.emit.apply(me, args);
          };
        }
        return Stream.prototype.on.call(me, ev, handler);
      };
      var CDATA = "[CDATA[";
      var DOCTYPE = "DOCTYPE";
      var XML_NAMESPACE = "http://www.w3.org/XML/1998/namespace";
      var XMLNS_NAMESPACE = "http://www.w3.org/2000/xmlns/";
      var rootNS = { xml: XML_NAMESPACE, xmlns: XMLNS_NAMESPACE };
      var nameStart = /[:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]/;
      var nameBody = /[:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u00B7\u0300-\u036F\u203F-\u2040.\d-]/;
      var entityStart = /[#:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]/;
      var entityBody = /[#:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u00B7\u0300-\u036F\u203F-\u2040.\d-]/;
      function isWhitespace(c) {
        return c === " " || c === "\n" || c === "\r" || c === "	";
      }
      function isQuote(c) {
        return c === '"' || c === "'";
      }
      function isAttribEnd(c) {
        return c === ">" || isWhitespace(c);
      }
      function isMatch(regex, c) {
        return regex.test(c);
      }
      function notMatch(regex, c) {
        return !isMatch(regex, c);
      }
      var S = 0;
      sax2.STATE = {
        BEGIN: S++,
        // leading byte order mark or whitespace
        BEGIN_WHITESPACE: S++,
        // leading whitespace
        TEXT: S++,
        // general stuff
        TEXT_ENTITY: S++,
        // &amp and such.
        OPEN_WAKA: S++,
        // <
        SGML_DECL: S++,
        // <!BLARG
        SGML_DECL_QUOTED: S++,
        // <!BLARG foo "bar
        DOCTYPE: S++,
        // <!DOCTYPE
        DOCTYPE_QUOTED: S++,
        // <!DOCTYPE "//blah
        DOCTYPE_DTD: S++,
        // <!DOCTYPE "//blah" [ ...
        DOCTYPE_DTD_QUOTED: S++,
        // <!DOCTYPE "//blah" [ "foo
        COMMENT_STARTING: S++,
        // <!-
        COMMENT: S++,
        // <!--
        COMMENT_ENDING: S++,
        // <!-- blah -
        COMMENT_ENDED: S++,
        // <!-- blah --
        CDATA: S++,
        // <![CDATA[ something
        CDATA_ENDING: S++,
        // ]
        CDATA_ENDING_2: S++,
        // ]]
        PROC_INST: S++,
        // <?hi
        PROC_INST_BODY: S++,
        // <?hi there
        PROC_INST_ENDING: S++,
        // <?hi "there" ?
        OPEN_TAG: S++,
        // <strong
        OPEN_TAG_SLASH: S++,
        // <strong /
        ATTRIB: S++,
        // <a
        ATTRIB_NAME: S++,
        // <a foo
        ATTRIB_NAME_SAW_WHITE: S++,
        // <a foo _
        ATTRIB_VALUE: S++,
        // <a foo=
        ATTRIB_VALUE_QUOTED: S++,
        // <a foo="bar
        ATTRIB_VALUE_CLOSED: S++,
        // <a foo="bar"
        ATTRIB_VALUE_UNQUOTED: S++,
        // <a foo=bar
        ATTRIB_VALUE_ENTITY_Q: S++,
        // <foo bar="&quot;"
        ATTRIB_VALUE_ENTITY_U: S++,
        // <foo bar=&quot
        CLOSE_TAG: S++,
        // </a
        CLOSE_TAG_SAW_WHITE: S++,
        // </a   >
        SCRIPT: S++,
        // <script> ...
        SCRIPT_ENDING: S++
        // <script> ... <
      };
      sax2.XML_ENTITIES = {
        "amp": "&",
        "gt": ">",
        "lt": "<",
        "quot": '"',
        "apos": "'"
      };
      sax2.ENTITIES = {
        "amp": "&",
        "gt": ">",
        "lt": "<",
        "quot": '"',
        "apos": "'",
        "AElig": 198,
        "Aacute": 193,
        "Acirc": 194,
        "Agrave": 192,
        "Aring": 197,
        "Atilde": 195,
        "Auml": 196,
        "Ccedil": 199,
        "ETH": 208,
        "Eacute": 201,
        "Ecirc": 202,
        "Egrave": 200,
        "Euml": 203,
        "Iacute": 205,
        "Icirc": 206,
        "Igrave": 204,
        "Iuml": 207,
        "Ntilde": 209,
        "Oacute": 211,
        "Ocirc": 212,
        "Ograve": 210,
        "Oslash": 216,
        "Otilde": 213,
        "Ouml": 214,
        "THORN": 222,
        "Uacute": 218,
        "Ucirc": 219,
        "Ugrave": 217,
        "Uuml": 220,
        "Yacute": 221,
        "aacute": 225,
        "acirc": 226,
        "aelig": 230,
        "agrave": 224,
        "aring": 229,
        "atilde": 227,
        "auml": 228,
        "ccedil": 231,
        "eacute": 233,
        "ecirc": 234,
        "egrave": 232,
        "eth": 240,
        "euml": 235,
        "iacute": 237,
        "icirc": 238,
        "igrave": 236,
        "iuml": 239,
        "ntilde": 241,
        "oacute": 243,
        "ocirc": 244,
        "ograve": 242,
        "oslash": 248,
        "otilde": 245,
        "ouml": 246,
        "szlig": 223,
        "thorn": 254,
        "uacute": 250,
        "ucirc": 251,
        "ugrave": 249,
        "uuml": 252,
        "yacute": 253,
        "yuml": 255,
        "copy": 169,
        "reg": 174,
        "nbsp": 160,
        "iexcl": 161,
        "cent": 162,
        "pound": 163,
        "curren": 164,
        "yen": 165,
        "brvbar": 166,
        "sect": 167,
        "uml": 168,
        "ordf": 170,
        "laquo": 171,
        "not": 172,
        "shy": 173,
        "macr": 175,
        "deg": 176,
        "plusmn": 177,
        "sup1": 185,
        "sup2": 178,
        "sup3": 179,
        "acute": 180,
        "micro": 181,
        "para": 182,
        "middot": 183,
        "cedil": 184,
        "ordm": 186,
        "raquo": 187,
        "frac14": 188,
        "frac12": 189,
        "frac34": 190,
        "iquest": 191,
        "times": 215,
        "divide": 247,
        "OElig": 338,
        "oelig": 339,
        "Scaron": 352,
        "scaron": 353,
        "Yuml": 376,
        "fnof": 402,
        "circ": 710,
        "tilde": 732,
        "Alpha": 913,
        "Beta": 914,
        "Gamma": 915,
        "Delta": 916,
        "Epsilon": 917,
        "Zeta": 918,
        "Eta": 919,
        "Theta": 920,
        "Iota": 921,
        "Kappa": 922,
        "Lambda": 923,
        "Mu": 924,
        "Nu": 925,
        "Xi": 926,
        "Omicron": 927,
        "Pi": 928,
        "Rho": 929,
        "Sigma": 931,
        "Tau": 932,
        "Upsilon": 933,
        "Phi": 934,
        "Chi": 935,
        "Psi": 936,
        "Omega": 937,
        "alpha": 945,
        "beta": 946,
        "gamma": 947,
        "delta": 948,
        "epsilon": 949,
        "zeta": 950,
        "eta": 951,
        "theta": 952,
        "iota": 953,
        "kappa": 954,
        "lambda": 955,
        "mu": 956,
        "nu": 957,
        "xi": 958,
        "omicron": 959,
        "pi": 960,
        "rho": 961,
        "sigmaf": 962,
        "sigma": 963,
        "tau": 964,
        "upsilon": 965,
        "phi": 966,
        "chi": 967,
        "psi": 968,
        "omega": 969,
        "thetasym": 977,
        "upsih": 978,
        "piv": 982,
        "ensp": 8194,
        "emsp": 8195,
        "thinsp": 8201,
        "zwnj": 8204,
        "zwj": 8205,
        "lrm": 8206,
        "rlm": 8207,
        "ndash": 8211,
        "mdash": 8212,
        "lsquo": 8216,
        "rsquo": 8217,
        "sbquo": 8218,
        "ldquo": 8220,
        "rdquo": 8221,
        "bdquo": 8222,
        "dagger": 8224,
        "Dagger": 8225,
        "bull": 8226,
        "hellip": 8230,
        "permil": 8240,
        "prime": 8242,
        "Prime": 8243,
        "lsaquo": 8249,
        "rsaquo": 8250,
        "oline": 8254,
        "frasl": 8260,
        "euro": 8364,
        "image": 8465,
        "weierp": 8472,
        "real": 8476,
        "trade": 8482,
        "alefsym": 8501,
        "larr": 8592,
        "uarr": 8593,
        "rarr": 8594,
        "darr": 8595,
        "harr": 8596,
        "crarr": 8629,
        "lArr": 8656,
        "uArr": 8657,
        "rArr": 8658,
        "dArr": 8659,
        "hArr": 8660,
        "forall": 8704,
        "part": 8706,
        "exist": 8707,
        "empty": 8709,
        "nabla": 8711,
        "isin": 8712,
        "notin": 8713,
        "ni": 8715,
        "prod": 8719,
        "sum": 8721,
        "minus": 8722,
        "lowast": 8727,
        "radic": 8730,
        "prop": 8733,
        "infin": 8734,
        "ang": 8736,
        "and": 8743,
        "or": 8744,
        "cap": 8745,
        "cup": 8746,
        "int": 8747,
        "there4": 8756,
        "sim": 8764,
        "cong": 8773,
        "asymp": 8776,
        "ne": 8800,
        "equiv": 8801,
        "le": 8804,
        "ge": 8805,
        "sub": 8834,
        "sup": 8835,
        "nsub": 8836,
        "sube": 8838,
        "supe": 8839,
        "oplus": 8853,
        "otimes": 8855,
        "perp": 8869,
        "sdot": 8901,
        "lceil": 8968,
        "rceil": 8969,
        "lfloor": 8970,
        "rfloor": 8971,
        "lang": 9001,
        "rang": 9002,
        "loz": 9674,
        "spades": 9824,
        "clubs": 9827,
        "hearts": 9829,
        "diams": 9830
      };
      Object.keys(sax2.ENTITIES).forEach(function(key) {
        var e = sax2.ENTITIES[key];
        var s2 = typeof e === "number" ? String.fromCharCode(e) : e;
        sax2.ENTITIES[key] = s2;
      });
      for (var s in sax2.STATE) {
        sax2.STATE[sax2.STATE[s]] = s;
      }
      S = sax2.STATE;
      function emit(parser, event, data) {
        parser[event] && parser[event](data);
      }
      function emitNode(parser, nodeType, data) {
        if (parser.textNode) closeText(parser);
        emit(parser, nodeType, data);
      }
      function closeText(parser) {
        parser.textNode = textopts(parser.opt, parser.textNode);
        if (parser.textNode) emit(parser, "ontext", parser.textNode);
        parser.textNode = "";
      }
      function textopts(opt, text) {
        if (opt.trim) text = text.trim();
        if (opt.normalize) text = text.replace(/\s+/g, " ");
        return text;
      }
      function error2(parser, er) {
        closeText(parser);
        if (parser.trackPosition) {
          er += "\nLine: " + parser.line + "\nColumn: " + parser.column + "\nChar: " + parser.c;
        }
        er = new Error(er);
        parser.error = er;
        emit(parser, "onerror", er);
        return parser;
      }
      function end(parser) {
        if (parser.sawRoot && !parser.closedRoot) strictFail(parser, "Unclosed root tag");
        if (parser.state !== S.BEGIN && parser.state !== S.BEGIN_WHITESPACE && parser.state !== S.TEXT) {
          error2(parser, "Unexpected end");
        }
        closeText(parser);
        parser.c = "";
        parser.closed = true;
        emit(parser, "onend");
        SAXParser.call(parser, parser.strict, parser.opt);
        return parser;
      }
      function strictFail(parser, message) {
        if (typeof parser !== "object" || !(parser instanceof SAXParser)) {
          throw new Error("bad call to strictFail");
        }
        if (parser.strict) {
          error2(parser, message);
        }
      }
      function newTag(parser) {
        if (!parser.strict) parser.tagName = parser.tagName[parser.looseCase]();
        var parent = parser.tags[parser.tags.length - 1] || parser;
        var tag = parser.tag = { name: parser.tagName, attributes: {} };
        if (parser.opt.xmlns) {
          tag.ns = parent.ns;
        }
        parser.attribList.length = 0;
        emitNode(parser, "onopentagstart", tag);
      }
      function qname(name, attribute) {
        var i = name.indexOf(":");
        var qualName = i < 0 ? ["", name] : name.split(":");
        var prefix = qualName[0];
        var local = qualName[1];
        if (attribute && name === "xmlns") {
          prefix = "xmlns";
          local = "";
        }
        return { prefix, local };
      }
      function attrib(parser) {
        if (!parser.strict) {
          parser.attribName = parser.attribName[parser.looseCase]();
        }
        if (parser.attribList.indexOf(parser.attribName) !== -1 || parser.tag.attributes.hasOwnProperty(parser.attribName)) {
          parser.attribName = parser.attribValue = "";
          return;
        }
        if (parser.opt.xmlns) {
          var qn = qname(parser.attribName, true);
          var prefix = qn.prefix;
          var local = qn.local;
          if (prefix === "xmlns") {
            if (local === "xml" && parser.attribValue !== XML_NAMESPACE) {
              strictFail(
                parser,
                "xml: prefix must be bound to " + XML_NAMESPACE + "\nActual: " + parser.attribValue
              );
            } else if (local === "xmlns" && parser.attribValue !== XMLNS_NAMESPACE) {
              strictFail(
                parser,
                "xmlns: prefix must be bound to " + XMLNS_NAMESPACE + "\nActual: " + parser.attribValue
              );
            } else {
              var tag = parser.tag;
              var parent = parser.tags[parser.tags.length - 1] || parser;
              if (tag.ns === parent.ns) {
                tag.ns = Object.create(parent.ns);
              }
              tag.ns[local] = parser.attribValue;
            }
          }
          parser.attribList.push([parser.attribName, parser.attribValue]);
        } else {
          parser.tag.attributes[parser.attribName] = parser.attribValue;
          emitNode(parser, "onattribute", {
            name: parser.attribName,
            value: parser.attribValue
          });
        }
        parser.attribName = parser.attribValue = "";
      }
      function openTag(parser, selfClosing) {
        if (parser.opt.xmlns) {
          var tag = parser.tag;
          var qn = qname(parser.tagName);
          tag.prefix = qn.prefix;
          tag.local = qn.local;
          tag.uri = tag.ns[qn.prefix] || "";
          if (tag.prefix && !tag.uri) {
            strictFail(parser, "Unbound namespace prefix: " + JSON.stringify(parser.tagName));
            tag.uri = qn.prefix;
          }
          var parent = parser.tags[parser.tags.length - 1] || parser;
          if (tag.ns && parent.ns !== tag.ns) {
            Object.keys(tag.ns).forEach(function(p) {
              emitNode(parser, "onopennamespace", {
                prefix: p,
                uri: tag.ns[p]
              });
            });
          }
          for (var i = 0, l = parser.attribList.length; i < l; i++) {
            var nv = parser.attribList[i];
            var name = nv[0];
            var value = nv[1];
            var qualName = qname(name, true);
            var prefix = qualName.prefix;
            var local = qualName.local;
            var uri = prefix === "" ? "" : tag.ns[prefix] || "";
            var a = {
              name,
              value,
              prefix,
              local,
              uri
            };
            if (prefix && prefix !== "xmlns" && !uri) {
              strictFail(parser, "Unbound namespace prefix: " + JSON.stringify(prefix));
              a.uri = prefix;
            }
            parser.tag.attributes[name] = a;
            emitNode(parser, "onattribute", a);
          }
          parser.attribList.length = 0;
        }
        parser.tag.isSelfClosing = !!selfClosing;
        parser.sawRoot = true;
        parser.tags.push(parser.tag);
        emitNode(parser, "onopentag", parser.tag);
        if (!selfClosing) {
          if (!parser.noscript && parser.tagName.toLowerCase() === "script") {
            parser.state = S.SCRIPT;
          } else {
            parser.state = S.TEXT;
          }
          parser.tag = null;
          parser.tagName = "";
        }
        parser.attribName = parser.attribValue = "";
        parser.attribList.length = 0;
      }
      function closeTag(parser) {
        if (!parser.tagName) {
          strictFail(parser, "Weird empty close tag.");
          parser.textNode += "</>";
          parser.state = S.TEXT;
          return;
        }
        if (parser.script) {
          if (parser.tagName !== "script") {
            parser.script += "</" + parser.tagName + ">";
            parser.tagName = "";
            parser.state = S.SCRIPT;
            return;
          }
          emitNode(parser, "onscript", parser.script);
          parser.script = "";
        }
        var t = parser.tags.length;
        var tagName = parser.tagName;
        if (!parser.strict) {
          tagName = tagName[parser.looseCase]();
        }
        var closeTo = tagName;
        while (t--) {
          var close = parser.tags[t];
          if (close.name !== closeTo) {
            strictFail(parser, "Unexpected close tag");
          } else {
            break;
          }
        }
        if (t < 0) {
          strictFail(parser, "Unmatched closing tag: " + parser.tagName);
          parser.textNode += "</" + parser.tagName + ">";
          parser.state = S.TEXT;
          return;
        }
        parser.tagName = tagName;
        var s2 = parser.tags.length;
        while (s2-- > t) {
          var tag = parser.tag = parser.tags.pop();
          parser.tagName = parser.tag.name;
          emitNode(parser, "onclosetag", parser.tagName);
          var x = {};
          for (var i in tag.ns) {
            x[i] = tag.ns[i];
          }
          var parent = parser.tags[parser.tags.length - 1] || parser;
          if (parser.opt.xmlns && tag.ns !== parent.ns) {
            Object.keys(tag.ns).forEach(function(p) {
              var n = tag.ns[p];
              emitNode(parser, "onclosenamespace", { prefix: p, uri: n });
            });
          }
        }
        if (t === 0) parser.closedRoot = true;
        parser.tagName = parser.attribValue = parser.attribName = "";
        parser.attribList.length = 0;
        parser.state = S.TEXT;
      }
      function parseEntity(parser) {
        var entity = parser.entity;
        var entityLC = entity.toLowerCase();
        var num;
        var numStr = "";
        if (parser.ENTITIES[entity]) {
          return parser.ENTITIES[entity];
        }
        if (parser.ENTITIES[entityLC]) {
          return parser.ENTITIES[entityLC];
        }
        entity = entityLC;
        if (entity.charAt(0) === "#") {
          if (entity.charAt(1) === "x") {
            entity = entity.slice(2);
            num = parseInt(entity, 16);
            numStr = num.toString(16);
          } else {
            entity = entity.slice(1);
            num = parseInt(entity, 10);
            numStr = num.toString(10);
          }
        }
        entity = entity.replace(/^0+/, "");
        if (isNaN(num) || numStr.toLowerCase() !== entity) {
          strictFail(parser, "Invalid character entity");
          return "&" + parser.entity + ";";
        }
        return String.fromCodePoint(num);
      }
      function beginWhiteSpace(parser, c) {
        if (c === "<") {
          parser.state = S.OPEN_WAKA;
          parser.startTagPosition = parser.position;
        } else if (!isWhitespace(c)) {
          strictFail(parser, "Non-whitespace before first tag.");
          parser.textNode = c;
          parser.state = S.TEXT;
        }
      }
      function charAt(chunk, i) {
        var result = "";
        if (i < chunk.length) {
          result = chunk.charAt(i);
        }
        return result;
      }
      function write(chunk) {
        var parser = this;
        if (this.error) {
          throw this.error;
        }
        if (parser.closed) {
          return error2(
            parser,
            "Cannot write after close. Assign an onready handler."
          );
        }
        if (chunk === null) {
          return end(parser);
        }
        if (typeof chunk === "object") {
          chunk = chunk.toString();
        }
        var i = 0;
        var c = "";
        while (true) {
          c = charAt(chunk, i++);
          parser.c = c;
          if (!c) {
            break;
          }
          if (parser.trackPosition) {
            parser.position++;
            if (c === "\n") {
              parser.line++;
              parser.column = 0;
            } else {
              parser.column++;
            }
          }
          switch (parser.state) {
            case S.BEGIN:
              parser.state = S.BEGIN_WHITESPACE;
              if (c === "\uFEFF") {
                continue;
              }
              beginWhiteSpace(parser, c);
              continue;
            case S.BEGIN_WHITESPACE:
              beginWhiteSpace(parser, c);
              continue;
            case S.TEXT:
              if (parser.sawRoot && !parser.closedRoot) {
                var starti = i - 1;
                while (c && c !== "<" && c !== "&") {
                  c = charAt(chunk, i++);
                  if (c && parser.trackPosition) {
                    parser.position++;
                    if (c === "\n") {
                      parser.line++;
                      parser.column = 0;
                    } else {
                      parser.column++;
                    }
                  }
                }
                parser.textNode += chunk.substring(starti, i - 1);
              }
              if (c === "<" && !(parser.sawRoot && parser.closedRoot && !parser.strict)) {
                parser.state = S.OPEN_WAKA;
                parser.startTagPosition = parser.position;
              } else {
                if (!isWhitespace(c) && (!parser.sawRoot || parser.closedRoot)) {
                  strictFail(parser, "Text data outside of root node.");
                }
                if (c === "&") {
                  parser.state = S.TEXT_ENTITY;
                } else {
                  parser.textNode += c;
                }
              }
              continue;
            case S.SCRIPT:
              if (c === "<") {
                parser.state = S.SCRIPT_ENDING;
              } else {
                parser.script += c;
              }
              continue;
            case S.SCRIPT_ENDING:
              if (c === "/") {
                parser.state = S.CLOSE_TAG;
              } else {
                parser.script += "<" + c;
                parser.state = S.SCRIPT;
              }
              continue;
            case S.OPEN_WAKA:
              if (c === "!") {
                parser.state = S.SGML_DECL;
                parser.sgmlDecl = "";
              } else if (isWhitespace(c)) ;
              else if (isMatch(nameStart, c)) {
                parser.state = S.OPEN_TAG;
                parser.tagName = c;
              } else if (c === "/") {
                parser.state = S.CLOSE_TAG;
                parser.tagName = "";
              } else if (c === "?") {
                parser.state = S.PROC_INST;
                parser.procInstName = parser.procInstBody = "";
              } else {
                strictFail(parser, "Unencoded <");
                if (parser.startTagPosition + 1 < parser.position) {
                  var pad = parser.position - parser.startTagPosition;
                  c = new Array(pad).join(" ") + c;
                }
                parser.textNode += "<" + c;
                parser.state = S.TEXT;
              }
              continue;
            case S.SGML_DECL:
              if (parser.sgmlDecl + c === "--") {
                parser.state = S.COMMENT;
                parser.comment = "";
                parser.sgmlDecl = "";
                continue;
              }
              if (parser.doctype && parser.doctype !== true && parser.sgmlDecl) {
                parser.state = S.DOCTYPE_DTD;
                parser.doctype += "<!" + parser.sgmlDecl + c;
                parser.sgmlDecl = "";
              } else if ((parser.sgmlDecl + c).toUpperCase() === CDATA) {
                emitNode(parser, "onopencdata");
                parser.state = S.CDATA;
                parser.sgmlDecl = "";
                parser.cdata = "";
              } else if ((parser.sgmlDecl + c).toUpperCase() === DOCTYPE) {
                parser.state = S.DOCTYPE;
                if (parser.doctype || parser.sawRoot) {
                  strictFail(
                    parser,
                    "Inappropriately located doctype declaration"
                  );
                }
                parser.doctype = "";
                parser.sgmlDecl = "";
              } else if (c === ">") {
                emitNode(parser, "onsgmldeclaration", parser.sgmlDecl);
                parser.sgmlDecl = "";
                parser.state = S.TEXT;
              } else if (isQuote(c)) {
                parser.state = S.SGML_DECL_QUOTED;
                parser.sgmlDecl += c;
              } else {
                parser.sgmlDecl += c;
              }
              continue;
            case S.SGML_DECL_QUOTED:
              if (c === parser.q) {
                parser.state = S.SGML_DECL;
                parser.q = "";
              }
              parser.sgmlDecl += c;
              continue;
            case S.DOCTYPE:
              if (c === ">") {
                parser.state = S.TEXT;
                emitNode(parser, "ondoctype", parser.doctype);
                parser.doctype = true;
              } else {
                parser.doctype += c;
                if (c === "[") {
                  parser.state = S.DOCTYPE_DTD;
                } else if (isQuote(c)) {
                  parser.state = S.DOCTYPE_QUOTED;
                  parser.q = c;
                }
              }
              continue;
            case S.DOCTYPE_QUOTED:
              parser.doctype += c;
              if (c === parser.q) {
                parser.q = "";
                parser.state = S.DOCTYPE;
              }
              continue;
            case S.DOCTYPE_DTD:
              if (c === "]") {
                parser.doctype += c;
                parser.state = S.DOCTYPE;
              } else if (c === "<") {
                parser.state = S.OPEN_WAKA;
                parser.startTagPosition = parser.position;
              } else if (isQuote(c)) {
                parser.doctype += c;
                parser.state = S.DOCTYPE_DTD_QUOTED;
                parser.q = c;
              } else {
                parser.doctype += c;
              }
              continue;
            case S.DOCTYPE_DTD_QUOTED:
              parser.doctype += c;
              if (c === parser.q) {
                parser.state = S.DOCTYPE_DTD;
                parser.q = "";
              }
              continue;
            case S.COMMENT:
              if (c === "-") {
                parser.state = S.COMMENT_ENDING;
              } else {
                parser.comment += c;
              }
              continue;
            case S.COMMENT_ENDING:
              if (c === "-") {
                parser.state = S.COMMENT_ENDED;
                parser.comment = textopts(parser.opt, parser.comment);
                if (parser.comment) {
                  emitNode(parser, "oncomment", parser.comment);
                }
                parser.comment = "";
              } else {
                parser.comment += "-" + c;
                parser.state = S.COMMENT;
              }
              continue;
            case S.COMMENT_ENDED:
              if (c !== ">") {
                strictFail(parser, "Malformed comment");
                parser.comment += "--" + c;
                parser.state = S.COMMENT;
              } else if (parser.doctype && parser.doctype !== true) {
                parser.state = S.DOCTYPE_DTD;
              } else {
                parser.state = S.TEXT;
              }
              continue;
            case S.CDATA:
              if (c === "]") {
                parser.state = S.CDATA_ENDING;
              } else {
                parser.cdata += c;
              }
              continue;
            case S.CDATA_ENDING:
              if (c === "]") {
                parser.state = S.CDATA_ENDING_2;
              } else {
                parser.cdata += "]" + c;
                parser.state = S.CDATA;
              }
              continue;
            case S.CDATA_ENDING_2:
              if (c === ">") {
                if (parser.cdata) {
                  emitNode(parser, "oncdata", parser.cdata);
                }
                emitNode(parser, "onclosecdata");
                parser.cdata = "";
                parser.state = S.TEXT;
              } else if (c === "]") {
                parser.cdata += "]";
              } else {
                parser.cdata += "]]" + c;
                parser.state = S.CDATA;
              }
              continue;
            case S.PROC_INST:
              if (c === "?") {
                parser.state = S.PROC_INST_ENDING;
              } else if (isWhitespace(c)) {
                parser.state = S.PROC_INST_BODY;
              } else {
                parser.procInstName += c;
              }
              continue;
            case S.PROC_INST_BODY:
              if (!parser.procInstBody && isWhitespace(c)) {
                continue;
              } else if (c === "?") {
                parser.state = S.PROC_INST_ENDING;
              } else {
                parser.procInstBody += c;
              }
              continue;
            case S.PROC_INST_ENDING:
              if (c === ">") {
                emitNode(parser, "onprocessinginstruction", {
                  name: parser.procInstName,
                  body: parser.procInstBody
                });
                parser.procInstName = parser.procInstBody = "";
                parser.state = S.TEXT;
              } else {
                parser.procInstBody += "?" + c;
                parser.state = S.PROC_INST_BODY;
              }
              continue;
            case S.OPEN_TAG:
              if (isMatch(nameBody, c)) {
                parser.tagName += c;
              } else {
                newTag(parser);
                if (c === ">") {
                  openTag(parser);
                } else if (c === "/") {
                  parser.state = S.OPEN_TAG_SLASH;
                } else {
                  if (!isWhitespace(c)) {
                    strictFail(parser, "Invalid character in tag name");
                  }
                  parser.state = S.ATTRIB;
                }
              }
              continue;
            case S.OPEN_TAG_SLASH:
              if (c === ">") {
                openTag(parser, true);
                closeTag(parser);
              } else {
                strictFail(parser, "Forward-slash in opening tag not followed by >");
                parser.state = S.ATTRIB;
              }
              continue;
            case S.ATTRIB:
              if (isWhitespace(c)) {
                continue;
              } else if (c === ">") {
                openTag(parser);
              } else if (c === "/") {
                parser.state = S.OPEN_TAG_SLASH;
              } else if (isMatch(nameStart, c)) {
                parser.attribName = c;
                parser.attribValue = "";
                parser.state = S.ATTRIB_NAME;
              } else {
                strictFail(parser, "Invalid attribute name");
              }
              continue;
            case S.ATTRIB_NAME:
              if (c === "=") {
                parser.state = S.ATTRIB_VALUE;
              } else if (c === ">") {
                strictFail(parser, "Attribute without value");
                parser.attribValue = parser.attribName;
                attrib(parser);
                openTag(parser);
              } else if (isWhitespace(c)) {
                parser.state = S.ATTRIB_NAME_SAW_WHITE;
              } else if (isMatch(nameBody, c)) {
                parser.attribName += c;
              } else {
                strictFail(parser, "Invalid attribute name");
              }
              continue;
            case S.ATTRIB_NAME_SAW_WHITE:
              if (c === "=") {
                parser.state = S.ATTRIB_VALUE;
              } else if (isWhitespace(c)) {
                continue;
              } else {
                strictFail(parser, "Attribute without value");
                parser.tag.attributes[parser.attribName] = "";
                parser.attribValue = "";
                emitNode(parser, "onattribute", {
                  name: parser.attribName,
                  value: ""
                });
                parser.attribName = "";
                if (c === ">") {
                  openTag(parser);
                } else if (isMatch(nameStart, c)) {
                  parser.attribName = c;
                  parser.state = S.ATTRIB_NAME;
                } else {
                  strictFail(parser, "Invalid attribute name");
                  parser.state = S.ATTRIB;
                }
              }
              continue;
            case S.ATTRIB_VALUE:
              if (isWhitespace(c)) {
                continue;
              } else if (isQuote(c)) {
                parser.q = c;
                parser.state = S.ATTRIB_VALUE_QUOTED;
              } else {
                if (!parser.opt.unquotedAttributeValues) {
                  error2(parser, "Unquoted attribute value");
                }
                parser.state = S.ATTRIB_VALUE_UNQUOTED;
                parser.attribValue = c;
              }
              continue;
            case S.ATTRIB_VALUE_QUOTED:
              if (c !== parser.q) {
                if (c === "&") {
                  parser.state = S.ATTRIB_VALUE_ENTITY_Q;
                } else {
                  parser.attribValue += c;
                }
                continue;
              }
              attrib(parser);
              parser.q = "";
              parser.state = S.ATTRIB_VALUE_CLOSED;
              continue;
            case S.ATTRIB_VALUE_CLOSED:
              if (isWhitespace(c)) {
                parser.state = S.ATTRIB;
              } else if (c === ">") {
                openTag(parser);
              } else if (c === "/") {
                parser.state = S.OPEN_TAG_SLASH;
              } else if (isMatch(nameStart, c)) {
                strictFail(parser, "No whitespace between attributes");
                parser.attribName = c;
                parser.attribValue = "";
                parser.state = S.ATTRIB_NAME;
              } else {
                strictFail(parser, "Invalid attribute name");
              }
              continue;
            case S.ATTRIB_VALUE_UNQUOTED:
              if (!isAttribEnd(c)) {
                if (c === "&") {
                  parser.state = S.ATTRIB_VALUE_ENTITY_U;
                } else {
                  parser.attribValue += c;
                }
                continue;
              }
              attrib(parser);
              if (c === ">") {
                openTag(parser);
              } else {
                parser.state = S.ATTRIB;
              }
              continue;
            case S.CLOSE_TAG:
              if (!parser.tagName) {
                if (isWhitespace(c)) {
                  continue;
                } else if (notMatch(nameStart, c)) {
                  if (parser.script) {
                    parser.script += "</" + c;
                    parser.state = S.SCRIPT;
                  } else {
                    strictFail(parser, "Invalid tagname in closing tag.");
                  }
                } else {
                  parser.tagName = c;
                }
              } else if (c === ">") {
                closeTag(parser);
              } else if (isMatch(nameBody, c)) {
                parser.tagName += c;
              } else if (parser.script) {
                parser.script += "</" + parser.tagName;
                parser.tagName = "";
                parser.state = S.SCRIPT;
              } else {
                if (!isWhitespace(c)) {
                  strictFail(parser, "Invalid tagname in closing tag");
                }
                parser.state = S.CLOSE_TAG_SAW_WHITE;
              }
              continue;
            case S.CLOSE_TAG_SAW_WHITE:
              if (isWhitespace(c)) {
                continue;
              }
              if (c === ">") {
                closeTag(parser);
              } else {
                strictFail(parser, "Invalid characters in closing tag");
              }
              continue;
            case S.TEXT_ENTITY:
            case S.ATTRIB_VALUE_ENTITY_Q:
            case S.ATTRIB_VALUE_ENTITY_U:
              var returnState;
              var buffer;
              switch (parser.state) {
                case S.TEXT_ENTITY:
                  returnState = S.TEXT;
                  buffer = "textNode";
                  break;
                case S.ATTRIB_VALUE_ENTITY_Q:
                  returnState = S.ATTRIB_VALUE_QUOTED;
                  buffer = "attribValue";
                  break;
                case S.ATTRIB_VALUE_ENTITY_U:
                  returnState = S.ATTRIB_VALUE_UNQUOTED;
                  buffer = "attribValue";
                  break;
              }
              if (c === ";") {
                var parsedEntity = parseEntity(parser);
                if (parser.opt.unparsedEntities && !Object.values(sax2.XML_ENTITIES).includes(parsedEntity)) {
                  parser.entity = "";
                  parser.state = returnState;
                  parser.write(parsedEntity);
                } else {
                  parser[buffer] += parsedEntity;
                  parser.entity = "";
                  parser.state = returnState;
                }
              } else if (isMatch(parser.entity.length ? entityBody : entityStart, c)) {
                parser.entity += c;
              } else {
                strictFail(parser, "Invalid character in entity name");
                parser[buffer] += "&" + parser.entity + c;
                parser.entity = "";
                parser.state = returnState;
              }
              continue;
            default: {
              throw new Error(parser, "Unknown state: " + parser.state);
            }
          }
        }
        if (parser.position >= parser.bufferCheckPosition) {
          checkBufferLength(parser);
        }
        return parser;
      }
      /*! http://mths.be/fromcodepoint v0.1.0 by @mathias */
      if (!String.fromCodePoint) {
        (function() {
          var stringFromCharCode = String.fromCharCode;
          var floor = Math.floor;
          var fromCodePoint = function() {
            var MAX_SIZE = 16384;
            var codeUnits = [];
            var highSurrogate;
            var lowSurrogate;
            var index = -1;
            var length = arguments.length;
            if (!length) {
              return "";
            }
            var result = "";
            while (++index < length) {
              var codePoint = Number(arguments[index]);
              if (!isFinite(codePoint) || // `NaN`, `+Infinity`, or `-Infinity`
              codePoint < 0 || // not a valid Unicode code point
              codePoint > 1114111 || // not a valid Unicode code point
              floor(codePoint) !== codePoint) {
                throw RangeError("Invalid code point: " + codePoint);
              }
              if (codePoint <= 65535) {
                codeUnits.push(codePoint);
              } else {
                codePoint -= 65536;
                highSurrogate = (codePoint >> 10) + 55296;
                lowSurrogate = codePoint % 1024 + 56320;
                codeUnits.push(highSurrogate, lowSurrogate);
              }
              if (index + 1 === length || codeUnits.length > MAX_SIZE) {
                result += stringFromCharCode.apply(null, codeUnits);
                codeUnits.length = 0;
              }
            }
            return result;
          };
          if (Object.defineProperty) {
            Object.defineProperty(String, "fromCodePoint", {
              value: fromCodePoint,
              configurable: true,
              writable: true
            });
          } else {
            String.fromCodePoint = fromCodePoint;
          }
        })();
      }
    })(exports);
  })(sax);
  return sax;
}
var hasRequiredXml;
function requireXml() {
  if (hasRequiredXml) return xml;
  hasRequiredXml = 1;
  Object.defineProperty(xml, "__esModule", { value: true });
  xml.XElement = void 0;
  xml.parseXml = parseXml;
  const sax2 = requireSax();
  const error_1 = requireError();
  class XElement {
    constructor(name) {
      this.name = name;
      this.value = "";
      this.attributes = null;
      this.isCData = false;
      this.elements = null;
      if (!name) {
        throw (0, error_1.newError)("Element name cannot be empty", "ERR_XML_ELEMENT_NAME_EMPTY");
      }
      if (!isValidName(name)) {
        throw (0, error_1.newError)(`Invalid element name: ${name}`, "ERR_XML_ELEMENT_INVALID_NAME");
      }
    }
    attribute(name) {
      const result = this.attributes === null ? null : this.attributes[name];
      if (result == null) {
        throw (0, error_1.newError)(`No attribute "${name}"`, "ERR_XML_MISSED_ATTRIBUTE");
      }
      return result;
    }
    removeAttribute(name) {
      if (this.attributes !== null) {
        delete this.attributes[name];
      }
    }
    element(name, ignoreCase = false, errorIfMissed = null) {
      const result = this.elementOrNull(name, ignoreCase);
      if (result === null) {
        throw (0, error_1.newError)(errorIfMissed || `No element "${name}"`, "ERR_XML_MISSED_ELEMENT");
      }
      return result;
    }
    elementOrNull(name, ignoreCase = false) {
      if (this.elements === null) {
        return null;
      }
      for (const element of this.elements) {
        if (isNameEquals(element, name, ignoreCase)) {
          return element;
        }
      }
      return null;
    }
    getElements(name, ignoreCase = false) {
      if (this.elements === null) {
        return [];
      }
      return this.elements.filter((it) => isNameEquals(it, name, ignoreCase));
    }
    elementValueOrEmpty(name, ignoreCase = false) {
      const element = this.elementOrNull(name, ignoreCase);
      return element === null ? "" : element.value;
    }
  }
  xml.XElement = XElement;
  const NAME_REG_EXP = new RegExp(/^[A-Za-z_][:A-Za-z0-9_-]*$/i);
  function isValidName(name) {
    return NAME_REG_EXP.test(name);
  }
  function isNameEquals(element, name, ignoreCase) {
    const elementName = element.name;
    return elementName === name || ignoreCase === true && elementName.length === name.length && elementName.toLowerCase() === name.toLowerCase();
  }
  function parseXml(data) {
    let rootElement = null;
    const parser = sax2.parser(true, {});
    const elements = [];
    parser.onopentag = (saxElement) => {
      const element = new XElement(saxElement.name);
      element.attributes = saxElement.attributes;
      if (rootElement === null) {
        rootElement = element;
      } else {
        const parent = elements[elements.length - 1];
        if (parent.elements == null) {
          parent.elements = [];
        }
        parent.elements.push(element);
      }
      elements.push(element);
    };
    parser.onclosetag = () => {
      elements.pop();
    };
    parser.ontext = (text) => {
      if (elements.length > 0) {
        elements[elements.length - 1].value = text;
      }
    };
    parser.oncdata = (cdata) => {
      const element = elements[elements.length - 1];
      element.value = cdata;
      element.isCData = true;
    };
    parser.onerror = (err) => {
      throw err;
    };
    parser.write(data);
    return rootElement;
  }
  return xml;
}
var hasRequiredOut;
function requireOut() {
  if (hasRequiredOut) return out;
  hasRequiredOut = 1;
  (function(exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CURRENT_APP_PACKAGE_FILE_NAME = exports.CURRENT_APP_INSTALLER_FILE_NAME = exports.XElement = exports.parseXml = exports.UUID = exports.parseDn = exports.retry = exports.githubUrl = exports.getS3LikeProviderBaseUrl = exports.ProgressCallbackTransform = exports.MemoLazy = exports.safeStringifyJson = exports.safeGetHeader = exports.parseJson = exports.HttpExecutor = exports.HttpError = exports.DigestTransform = exports.createHttpError = exports.configureRequestUrl = exports.configureRequestOptionsFromUrl = exports.configureRequestOptions = exports.newError = exports.CancellationToken = exports.CancellationError = void 0;
    exports.asArray = asArray;
    var CancellationToken_1 = requireCancellationToken();
    Object.defineProperty(exports, "CancellationError", { enumerable: true, get: function() {
      return CancellationToken_1.CancellationError;
    } });
    Object.defineProperty(exports, "CancellationToken", { enumerable: true, get: function() {
      return CancellationToken_1.CancellationToken;
    } });
    var error_1 = requireError();
    Object.defineProperty(exports, "newError", { enumerable: true, get: function() {
      return error_1.newError;
    } });
    var httpExecutor_1 = requireHttpExecutor();
    Object.defineProperty(exports, "configureRequestOptions", { enumerable: true, get: function() {
      return httpExecutor_1.configureRequestOptions;
    } });
    Object.defineProperty(exports, "configureRequestOptionsFromUrl", { enumerable: true, get: function() {
      return httpExecutor_1.configureRequestOptionsFromUrl;
    } });
    Object.defineProperty(exports, "configureRequestUrl", { enumerable: true, get: function() {
      return httpExecutor_1.configureRequestUrl;
    } });
    Object.defineProperty(exports, "createHttpError", { enumerable: true, get: function() {
      return httpExecutor_1.createHttpError;
    } });
    Object.defineProperty(exports, "DigestTransform", { enumerable: true, get: function() {
      return httpExecutor_1.DigestTransform;
    } });
    Object.defineProperty(exports, "HttpError", { enumerable: true, get: function() {
      return httpExecutor_1.HttpError;
    } });
    Object.defineProperty(exports, "HttpExecutor", { enumerable: true, get: function() {
      return httpExecutor_1.HttpExecutor;
    } });
    Object.defineProperty(exports, "parseJson", { enumerable: true, get: function() {
      return httpExecutor_1.parseJson;
    } });
    Object.defineProperty(exports, "safeGetHeader", { enumerable: true, get: function() {
      return httpExecutor_1.safeGetHeader;
    } });
    Object.defineProperty(exports, "safeStringifyJson", { enumerable: true, get: function() {
      return httpExecutor_1.safeStringifyJson;
    } });
    var MemoLazy_1 = requireMemoLazy();
    Object.defineProperty(exports, "MemoLazy", { enumerable: true, get: function() {
      return MemoLazy_1.MemoLazy;
    } });
    var ProgressCallbackTransform_1 = requireProgressCallbackTransform();
    Object.defineProperty(exports, "ProgressCallbackTransform", { enumerable: true, get: function() {
      return ProgressCallbackTransform_1.ProgressCallbackTransform;
    } });
    var publishOptions_1 = requirePublishOptions();
    Object.defineProperty(exports, "getS3LikeProviderBaseUrl", { enumerable: true, get: function() {
      return publishOptions_1.getS3LikeProviderBaseUrl;
    } });
    Object.defineProperty(exports, "githubUrl", { enumerable: true, get: function() {
      return publishOptions_1.githubUrl;
    } });
    var retry_1 = requireRetry();
    Object.defineProperty(exports, "retry", { enumerable: true, get: function() {
      return retry_1.retry;
    } });
    var rfc2253Parser_1 = requireRfc2253Parser();
    Object.defineProperty(exports, "parseDn", { enumerable: true, get: function() {
      return rfc2253Parser_1.parseDn;
    } });
    var uuid_1 = requireUuid();
    Object.defineProperty(exports, "UUID", { enumerable: true, get: function() {
      return uuid_1.UUID;
    } });
    var xml_1 = requireXml();
    Object.defineProperty(exports, "parseXml", { enumerable: true, get: function() {
      return xml_1.parseXml;
    } });
    Object.defineProperty(exports, "XElement", { enumerable: true, get: function() {
      return xml_1.XElement;
    } });
    exports.CURRENT_APP_INSTALLER_FILE_NAME = "installer.exe";
    exports.CURRENT_APP_PACKAGE_FILE_NAME = "package.7z";
    function asArray(v) {
      if (v == null) {
        return [];
      } else if (Array.isArray(v)) {
        return v;
      } else {
        return [v];
      }
    }
  })(out);
  return out;
}
var jsYaml = {};
var loader = {};
var common = {};
var hasRequiredCommon;
function requireCommon() {
  if (hasRequiredCommon) return common;
  hasRequiredCommon = 1;
  function isNothing(subject) {
    return typeof subject === "undefined" || subject === null;
  }
  function isObject(subject) {
    return typeof subject === "object" && subject !== null;
  }
  function toArray(sequence) {
    if (Array.isArray(sequence)) return sequence;
    else if (isNothing(sequence)) return [];
    return [sequence];
  }
  function extend(target, source) {
    var index, length, key, sourceKeys;
    if (source) {
      sourceKeys = Object.keys(source);
      for (index = 0, length = sourceKeys.length; index < length; index += 1) {
        key = sourceKeys[index];
        target[key] = source[key];
      }
    }
    return target;
  }
  function repeat(string, count) {
    var result = "", cycle;
    for (cycle = 0; cycle < count; cycle += 1) {
      result += string;
    }
    return result;
  }
  function isNegativeZero(number) {
    return number === 0 && Number.NEGATIVE_INFINITY === 1 / number;
  }
  common.isNothing = isNothing;
  common.isObject = isObject;
  common.toArray = toArray;
  common.repeat = repeat;
  common.isNegativeZero = isNegativeZero;
  common.extend = extend;
  return common;
}
var exception;
var hasRequiredException;
function requireException() {
  if (hasRequiredException) return exception;
  hasRequiredException = 1;
  function formatError(exception2, compact) {
    var where = "", message = exception2.reason || "(unknown reason)";
    if (!exception2.mark) return message;
    if (exception2.mark.name) {
      where += 'in "' + exception2.mark.name + '" ';
    }
    where += "(" + (exception2.mark.line + 1) + ":" + (exception2.mark.column + 1) + ")";
    if (!compact && exception2.mark.snippet) {
      where += "\n\n" + exception2.mark.snippet;
    }
    return message + " " + where;
  }
  function YAMLException(reason, mark) {
    Error.call(this);
    this.name = "YAMLException";
    this.reason = reason;
    this.mark = mark;
    this.message = formatError(this, false);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    } else {
      this.stack = new Error().stack || "";
    }
  }
  YAMLException.prototype = Object.create(Error.prototype);
  YAMLException.prototype.constructor = YAMLException;
  YAMLException.prototype.toString = function toString(compact) {
    return this.name + ": " + formatError(this, compact);
  };
  exception = YAMLException;
  return exception;
}
var snippet;
var hasRequiredSnippet;
function requireSnippet() {
  if (hasRequiredSnippet) return snippet;
  hasRequiredSnippet = 1;
  var common2 = requireCommon();
  function getLine(buffer, lineStart, lineEnd, position, maxLineLength) {
    var head = "";
    var tail = "";
    var maxHalfLength = Math.floor(maxLineLength / 2) - 1;
    if (position - lineStart > maxHalfLength) {
      head = " ... ";
      lineStart = position - maxHalfLength + head.length;
    }
    if (lineEnd - position > maxHalfLength) {
      tail = " ...";
      lineEnd = position + maxHalfLength - tail.length;
    }
    return {
      str: head + buffer.slice(lineStart, lineEnd).replace(/\t/g, "→") + tail,
      pos: position - lineStart + head.length
      // relative position
    };
  }
  function padStart(string, max) {
    return common2.repeat(" ", max - string.length) + string;
  }
  function makeSnippet(mark, options) {
    options = Object.create(options || null);
    if (!mark.buffer) return null;
    if (!options.maxLength) options.maxLength = 79;
    if (typeof options.indent !== "number") options.indent = 1;
    if (typeof options.linesBefore !== "number") options.linesBefore = 3;
    if (typeof options.linesAfter !== "number") options.linesAfter = 2;
    var re2 = /\r?\n|\r|\0/g;
    var lineStarts = [0];
    var lineEnds = [];
    var match;
    var foundLineNo = -1;
    while (match = re2.exec(mark.buffer)) {
      lineEnds.push(match.index);
      lineStarts.push(match.index + match[0].length);
      if (mark.position <= match.index && foundLineNo < 0) {
        foundLineNo = lineStarts.length - 2;
      }
    }
    if (foundLineNo < 0) foundLineNo = lineStarts.length - 1;
    var result = "", i, line;
    var lineNoLength = Math.min(mark.line + options.linesAfter, lineEnds.length).toString().length;
    var maxLineLength = options.maxLength - (options.indent + lineNoLength + 3);
    for (i = 1; i <= options.linesBefore; i++) {
      if (foundLineNo - i < 0) break;
      line = getLine(
        mark.buffer,
        lineStarts[foundLineNo - i],
        lineEnds[foundLineNo - i],
        mark.position - (lineStarts[foundLineNo] - lineStarts[foundLineNo - i]),
        maxLineLength
      );
      result = common2.repeat(" ", options.indent) + padStart((mark.line - i + 1).toString(), lineNoLength) + " | " + line.str + "\n" + result;
    }
    line = getLine(mark.buffer, lineStarts[foundLineNo], lineEnds[foundLineNo], mark.position, maxLineLength);
    result += common2.repeat(" ", options.indent) + padStart((mark.line + 1).toString(), lineNoLength) + " | " + line.str + "\n";
    result += common2.repeat("-", options.indent + lineNoLength + 3 + line.pos) + "^\n";
    for (i = 1; i <= options.linesAfter; i++) {
      if (foundLineNo + i >= lineEnds.length) break;
      line = getLine(
        mark.buffer,
        lineStarts[foundLineNo + i],
        lineEnds[foundLineNo + i],
        mark.position - (lineStarts[foundLineNo] - lineStarts[foundLineNo + i]),
        maxLineLength
      );
      result += common2.repeat(" ", options.indent) + padStart((mark.line + i + 1).toString(), lineNoLength) + " | " + line.str + "\n";
    }
    return result.replace(/\n$/, "");
  }
  snippet = makeSnippet;
  return snippet;
}
var type;
var hasRequiredType;
function requireType() {
  if (hasRequiredType) return type;
  hasRequiredType = 1;
  var YAMLException = requireException();
  var TYPE_CONSTRUCTOR_OPTIONS = [
    "kind",
    "multi",
    "resolve",
    "construct",
    "instanceOf",
    "predicate",
    "represent",
    "representName",
    "defaultStyle",
    "styleAliases"
  ];
  var YAML_NODE_KINDS = [
    "scalar",
    "sequence",
    "mapping"
  ];
  function compileStyleAliases(map2) {
    var result = {};
    if (map2 !== null) {
      Object.keys(map2).forEach(function(style) {
        map2[style].forEach(function(alias) {
          result[String(alias)] = style;
        });
      });
    }
    return result;
  }
  function Type(tag, options) {
    options = options || {};
    Object.keys(options).forEach(function(name) {
      if (TYPE_CONSTRUCTOR_OPTIONS.indexOf(name) === -1) {
        throw new YAMLException('Unknown option "' + name + '" is met in definition of "' + tag + '" YAML type.');
      }
    });
    this.options = options;
    this.tag = tag;
    this.kind = options["kind"] || null;
    this.resolve = options["resolve"] || function() {
      return true;
    };
    this.construct = options["construct"] || function(data) {
      return data;
    };
    this.instanceOf = options["instanceOf"] || null;
    this.predicate = options["predicate"] || null;
    this.represent = options["represent"] || null;
    this.representName = options["representName"] || null;
    this.defaultStyle = options["defaultStyle"] || null;
    this.multi = options["multi"] || false;
    this.styleAliases = compileStyleAliases(options["styleAliases"] || null);
    if (YAML_NODE_KINDS.indexOf(this.kind) === -1) {
      throw new YAMLException('Unknown kind "' + this.kind + '" is specified for "' + tag + '" YAML type.');
    }
  }
  type = Type;
  return type;
}
var schema;
var hasRequiredSchema;
function requireSchema() {
  if (hasRequiredSchema) return schema;
  hasRequiredSchema = 1;
  var YAMLException = requireException();
  var Type = requireType();
  function compileList(schema2, name) {
    var result = [];
    schema2[name].forEach(function(currentType) {
      var newIndex = result.length;
      result.forEach(function(previousType, previousIndex) {
        if (previousType.tag === currentType.tag && previousType.kind === currentType.kind && previousType.multi === currentType.multi) {
          newIndex = previousIndex;
        }
      });
      result[newIndex] = currentType;
    });
    return result;
  }
  function compileMap() {
    var result = {
      scalar: {},
      sequence: {},
      mapping: {},
      fallback: {},
      multi: {
        scalar: [],
        sequence: [],
        mapping: [],
        fallback: []
      }
    }, index, length;
    function collectType(type2) {
      if (type2.multi) {
        result.multi[type2.kind].push(type2);
        result.multi["fallback"].push(type2);
      } else {
        result[type2.kind][type2.tag] = result["fallback"][type2.tag] = type2;
      }
    }
    for (index = 0, length = arguments.length; index < length; index += 1) {
      arguments[index].forEach(collectType);
    }
    return result;
  }
  function Schema(definition) {
    return this.extend(definition);
  }
  Schema.prototype.extend = function extend(definition) {
    var implicit = [];
    var explicit = [];
    if (definition instanceof Type) {
      explicit.push(definition);
    } else if (Array.isArray(definition)) {
      explicit = explicit.concat(definition);
    } else if (definition && (Array.isArray(definition.implicit) || Array.isArray(definition.explicit))) {
      if (definition.implicit) implicit = implicit.concat(definition.implicit);
      if (definition.explicit) explicit = explicit.concat(definition.explicit);
    } else {
      throw new YAMLException("Schema.extend argument should be a Type, [ Type ], or a schema definition ({ implicit: [...], explicit: [...] })");
    }
    implicit.forEach(function(type2) {
      if (!(type2 instanceof Type)) {
        throw new YAMLException("Specified list of YAML types (or a single Type object) contains a non-Type object.");
      }
      if (type2.loadKind && type2.loadKind !== "scalar") {
        throw new YAMLException("There is a non-scalar type in the implicit list of a schema. Implicit resolving of such types is not supported.");
      }
      if (type2.multi) {
        throw new YAMLException("There is a multi type in the implicit list of a schema. Multi tags can only be listed as explicit.");
      }
    });
    explicit.forEach(function(type2) {
      if (!(type2 instanceof Type)) {
        throw new YAMLException("Specified list of YAML types (or a single Type object) contains a non-Type object.");
      }
    });
    var result = Object.create(Schema.prototype);
    result.implicit = (this.implicit || []).concat(implicit);
    result.explicit = (this.explicit || []).concat(explicit);
    result.compiledImplicit = compileList(result, "implicit");
    result.compiledExplicit = compileList(result, "explicit");
    result.compiledTypeMap = compileMap(result.compiledImplicit, result.compiledExplicit);
    return result;
  };
  schema = Schema;
  return schema;
}
var str;
var hasRequiredStr;
function requireStr() {
  if (hasRequiredStr) return str;
  hasRequiredStr = 1;
  var Type = requireType();
  str = new Type("tag:yaml.org,2002:str", {
    kind: "scalar",
    construct: function(data) {
      return data !== null ? data : "";
    }
  });
  return str;
}
var seq;
var hasRequiredSeq;
function requireSeq() {
  if (hasRequiredSeq) return seq;
  hasRequiredSeq = 1;
  var Type = requireType();
  seq = new Type("tag:yaml.org,2002:seq", {
    kind: "sequence",
    construct: function(data) {
      return data !== null ? data : [];
    }
  });
  return seq;
}
var map;
var hasRequiredMap;
function requireMap() {
  if (hasRequiredMap) return map;
  hasRequiredMap = 1;
  var Type = requireType();
  map = new Type("tag:yaml.org,2002:map", {
    kind: "mapping",
    construct: function(data) {
      return data !== null ? data : {};
    }
  });
  return map;
}
var failsafe;
var hasRequiredFailsafe;
function requireFailsafe() {
  if (hasRequiredFailsafe) return failsafe;
  hasRequiredFailsafe = 1;
  var Schema = requireSchema();
  failsafe = new Schema({
    explicit: [
      requireStr(),
      requireSeq(),
      requireMap()
    ]
  });
  return failsafe;
}
var _null;
var hasRequired_null;
function require_null() {
  if (hasRequired_null) return _null;
  hasRequired_null = 1;
  var Type = requireType();
  function resolveYamlNull(data) {
    if (data === null) return true;
    var max = data.length;
    return max === 1 && data === "~" || max === 4 && (data === "null" || data === "Null" || data === "NULL");
  }
  function constructYamlNull() {
    return null;
  }
  function isNull(object) {
    return object === null;
  }
  _null = new Type("tag:yaml.org,2002:null", {
    kind: "scalar",
    resolve: resolveYamlNull,
    construct: constructYamlNull,
    predicate: isNull,
    represent: {
      canonical: function() {
        return "~";
      },
      lowercase: function() {
        return "null";
      },
      uppercase: function() {
        return "NULL";
      },
      camelcase: function() {
        return "Null";
      },
      empty: function() {
        return "";
      }
    },
    defaultStyle: "lowercase"
  });
  return _null;
}
var bool;
var hasRequiredBool;
function requireBool() {
  if (hasRequiredBool) return bool;
  hasRequiredBool = 1;
  var Type = requireType();
  function resolveYamlBoolean(data) {
    if (data === null) return false;
    var max = data.length;
    return max === 4 && (data === "true" || data === "True" || data === "TRUE") || max === 5 && (data === "false" || data === "False" || data === "FALSE");
  }
  function constructYamlBoolean(data) {
    return data === "true" || data === "True" || data === "TRUE";
  }
  function isBoolean(object) {
    return Object.prototype.toString.call(object) === "[object Boolean]";
  }
  bool = new Type("tag:yaml.org,2002:bool", {
    kind: "scalar",
    resolve: resolveYamlBoolean,
    construct: constructYamlBoolean,
    predicate: isBoolean,
    represent: {
      lowercase: function(object) {
        return object ? "true" : "false";
      },
      uppercase: function(object) {
        return object ? "TRUE" : "FALSE";
      },
      camelcase: function(object) {
        return object ? "True" : "False";
      }
    },
    defaultStyle: "lowercase"
  });
  return bool;
}
var int;
var hasRequiredInt;
function requireInt() {
  if (hasRequiredInt) return int;
  hasRequiredInt = 1;
  var common2 = requireCommon();
  var Type = requireType();
  function isHexCode(c) {
    return 48 <= c && c <= 57 || 65 <= c && c <= 70 || 97 <= c && c <= 102;
  }
  function isOctCode(c) {
    return 48 <= c && c <= 55;
  }
  function isDecCode(c) {
    return 48 <= c && c <= 57;
  }
  function resolveYamlInteger(data) {
    if (data === null) return false;
    var max = data.length, index = 0, hasDigits = false, ch;
    if (!max) return false;
    ch = data[index];
    if (ch === "-" || ch === "+") {
      ch = data[++index];
    }
    if (ch === "0") {
      if (index + 1 === max) return true;
      ch = data[++index];
      if (ch === "b") {
        index++;
        for (; index < max; index++) {
          ch = data[index];
          if (ch === "_") continue;
          if (ch !== "0" && ch !== "1") return false;
          hasDigits = true;
        }
        return hasDigits && ch !== "_";
      }
      if (ch === "x") {
        index++;
        for (; index < max; index++) {
          ch = data[index];
          if (ch === "_") continue;
          if (!isHexCode(data.charCodeAt(index))) return false;
          hasDigits = true;
        }
        return hasDigits && ch !== "_";
      }
      if (ch === "o") {
        index++;
        for (; index < max; index++) {
          ch = data[index];
          if (ch === "_") continue;
          if (!isOctCode(data.charCodeAt(index))) return false;
          hasDigits = true;
        }
        return hasDigits && ch !== "_";
      }
    }
    if (ch === "_") return false;
    for (; index < max; index++) {
      ch = data[index];
      if (ch === "_") continue;
      if (!isDecCode(data.charCodeAt(index))) {
        return false;
      }
      hasDigits = true;
    }
    if (!hasDigits || ch === "_") return false;
    return true;
  }
  function constructYamlInteger(data) {
    var value = data, sign = 1, ch;
    if (value.indexOf("_") !== -1) {
      value = value.replace(/_/g, "");
    }
    ch = value[0];
    if (ch === "-" || ch === "+") {
      if (ch === "-") sign = -1;
      value = value.slice(1);
      ch = value[0];
    }
    if (value === "0") return 0;
    if (ch === "0") {
      if (value[1] === "b") return sign * parseInt(value.slice(2), 2);
      if (value[1] === "x") return sign * parseInt(value.slice(2), 16);
      if (value[1] === "o") return sign * parseInt(value.slice(2), 8);
    }
    return sign * parseInt(value, 10);
  }
  function isInteger(object) {
    return Object.prototype.toString.call(object) === "[object Number]" && (object % 1 === 0 && !common2.isNegativeZero(object));
  }
  int = new Type("tag:yaml.org,2002:int", {
    kind: "scalar",
    resolve: resolveYamlInteger,
    construct: constructYamlInteger,
    predicate: isInteger,
    represent: {
      binary: function(obj) {
        return obj >= 0 ? "0b" + obj.toString(2) : "-0b" + obj.toString(2).slice(1);
      },
      octal: function(obj) {
        return obj >= 0 ? "0o" + obj.toString(8) : "-0o" + obj.toString(8).slice(1);
      },
      decimal: function(obj) {
        return obj.toString(10);
      },
      /* eslint-disable max-len */
      hexadecimal: function(obj) {
        return obj >= 0 ? "0x" + obj.toString(16).toUpperCase() : "-0x" + obj.toString(16).toUpperCase().slice(1);
      }
    },
    defaultStyle: "decimal",
    styleAliases: {
      binary: [2, "bin"],
      octal: [8, "oct"],
      decimal: [10, "dec"],
      hexadecimal: [16, "hex"]
    }
  });
  return int;
}
var float;
var hasRequiredFloat;
function requireFloat() {
  if (hasRequiredFloat) return float;
  hasRequiredFloat = 1;
  var common2 = requireCommon();
  var Type = requireType();
  var YAML_FLOAT_PATTERN = new RegExp(
    // 2.5e4, 2.5 and integers
    "^(?:[-+]?(?:[0-9][0-9_]*)(?:\\.[0-9_]*)?(?:[eE][-+]?[0-9]+)?|\\.[0-9_]+(?:[eE][-+]?[0-9]+)?|[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$"
  );
  function resolveYamlFloat(data) {
    if (data === null) return false;
    if (!YAML_FLOAT_PATTERN.test(data) || // Quick hack to not allow integers end with `_`
    // Probably should update regexp & check speed
    data[data.length - 1] === "_") {
      return false;
    }
    return true;
  }
  function constructYamlFloat(data) {
    var value, sign;
    value = data.replace(/_/g, "").toLowerCase();
    sign = value[0] === "-" ? -1 : 1;
    if ("+-".indexOf(value[0]) >= 0) {
      value = value.slice(1);
    }
    if (value === ".inf") {
      return sign === 1 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
    } else if (value === ".nan") {
      return NaN;
    }
    return sign * parseFloat(value, 10);
  }
  var SCIENTIFIC_WITHOUT_DOT = /^[-+]?[0-9]+e/;
  function representYamlFloat(object, style) {
    var res;
    if (isNaN(object)) {
      switch (style) {
        case "lowercase":
          return ".nan";
        case "uppercase":
          return ".NAN";
        case "camelcase":
          return ".NaN";
      }
    } else if (Number.POSITIVE_INFINITY === object) {
      switch (style) {
        case "lowercase":
          return ".inf";
        case "uppercase":
          return ".INF";
        case "camelcase":
          return ".Inf";
      }
    } else if (Number.NEGATIVE_INFINITY === object) {
      switch (style) {
        case "lowercase":
          return "-.inf";
        case "uppercase":
          return "-.INF";
        case "camelcase":
          return "-.Inf";
      }
    } else if (common2.isNegativeZero(object)) {
      return "-0.0";
    }
    res = object.toString(10);
    return SCIENTIFIC_WITHOUT_DOT.test(res) ? res.replace("e", ".e") : res;
  }
  function isFloat(object) {
    return Object.prototype.toString.call(object) === "[object Number]" && (object % 1 !== 0 || common2.isNegativeZero(object));
  }
  float = new Type("tag:yaml.org,2002:float", {
    kind: "scalar",
    resolve: resolveYamlFloat,
    construct: constructYamlFloat,
    predicate: isFloat,
    represent: representYamlFloat,
    defaultStyle: "lowercase"
  });
  return float;
}
var json;
var hasRequiredJson;
function requireJson() {
  if (hasRequiredJson) return json;
  hasRequiredJson = 1;
  json = requireFailsafe().extend({
    implicit: [
      require_null(),
      requireBool(),
      requireInt(),
      requireFloat()
    ]
  });
  return json;
}
var core;
var hasRequiredCore;
function requireCore() {
  if (hasRequiredCore) return core;
  hasRequiredCore = 1;
  core = requireJson();
  return core;
}
var timestamp;
var hasRequiredTimestamp;
function requireTimestamp() {
  if (hasRequiredTimestamp) return timestamp;
  hasRequiredTimestamp = 1;
  var Type = requireType();
  var YAML_DATE_REGEXP = new RegExp(
    "^([0-9][0-9][0-9][0-9])-([0-9][0-9])-([0-9][0-9])$"
  );
  var YAML_TIMESTAMP_REGEXP = new RegExp(
    "^([0-9][0-9][0-9][0-9])-([0-9][0-9]?)-([0-9][0-9]?)(?:[Tt]|[ \\t]+)([0-9][0-9]?):([0-9][0-9]):([0-9][0-9])(?:\\.([0-9]*))?(?:[ \\t]*(Z|([-+])([0-9][0-9]?)(?::([0-9][0-9]))?))?$"
  );
  function resolveYamlTimestamp(data) {
    if (data === null) return false;
    if (YAML_DATE_REGEXP.exec(data) !== null) return true;
    if (YAML_TIMESTAMP_REGEXP.exec(data) !== null) return true;
    return false;
  }
  function constructYamlTimestamp(data) {
    var match, year, month, day, hour, minute, second, fraction = 0, delta = null, tz_hour, tz_minute, date;
    match = YAML_DATE_REGEXP.exec(data);
    if (match === null) match = YAML_TIMESTAMP_REGEXP.exec(data);
    if (match === null) throw new Error("Date resolve error");
    year = +match[1];
    month = +match[2] - 1;
    day = +match[3];
    if (!match[4]) {
      return new Date(Date.UTC(year, month, day));
    }
    hour = +match[4];
    minute = +match[5];
    second = +match[6];
    if (match[7]) {
      fraction = match[7].slice(0, 3);
      while (fraction.length < 3) {
        fraction += "0";
      }
      fraction = +fraction;
    }
    if (match[9]) {
      tz_hour = +match[10];
      tz_minute = +(match[11] || 0);
      delta = (tz_hour * 60 + tz_minute) * 6e4;
      if (match[9] === "-") delta = -delta;
    }
    date = new Date(Date.UTC(year, month, day, hour, minute, second, fraction));
    if (delta) date.setTime(date.getTime() - delta);
    return date;
  }
  function representYamlTimestamp(object) {
    return object.toISOString();
  }
  timestamp = new Type("tag:yaml.org,2002:timestamp", {
    kind: "scalar",
    resolve: resolveYamlTimestamp,
    construct: constructYamlTimestamp,
    instanceOf: Date,
    represent: representYamlTimestamp
  });
  return timestamp;
}
var merge;
var hasRequiredMerge;
function requireMerge() {
  if (hasRequiredMerge) return merge;
  hasRequiredMerge = 1;
  var Type = requireType();
  function resolveYamlMerge(data) {
    return data === "<<" || data === null;
  }
  merge = new Type("tag:yaml.org,2002:merge", {
    kind: "scalar",
    resolve: resolveYamlMerge
  });
  return merge;
}
var binary;
var hasRequiredBinary;
function requireBinary() {
  if (hasRequiredBinary) return binary;
  hasRequiredBinary = 1;
  var Type = requireType();
  var BASE64_MAP = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=\n\r";
  function resolveYamlBinary(data) {
    if (data === null) return false;
    var code, idx, bitlen = 0, max = data.length, map2 = BASE64_MAP;
    for (idx = 0; idx < max; idx++) {
      code = map2.indexOf(data.charAt(idx));
      if (code > 64) continue;
      if (code < 0) return false;
      bitlen += 6;
    }
    return bitlen % 8 === 0;
  }
  function constructYamlBinary(data) {
    var idx, tailbits, input = data.replace(/[\r\n=]/g, ""), max = input.length, map2 = BASE64_MAP, bits = 0, result = [];
    for (idx = 0; idx < max; idx++) {
      if (idx % 4 === 0 && idx) {
        result.push(bits >> 16 & 255);
        result.push(bits >> 8 & 255);
        result.push(bits & 255);
      }
      bits = bits << 6 | map2.indexOf(input.charAt(idx));
    }
    tailbits = max % 4 * 6;
    if (tailbits === 0) {
      result.push(bits >> 16 & 255);
      result.push(bits >> 8 & 255);
      result.push(bits & 255);
    } else if (tailbits === 18) {
      result.push(bits >> 10 & 255);
      result.push(bits >> 2 & 255);
    } else if (tailbits === 12) {
      result.push(bits >> 4 & 255);
    }
    return new Uint8Array(result);
  }
  function representYamlBinary(object) {
    var result = "", bits = 0, idx, tail, max = object.length, map2 = BASE64_MAP;
    for (idx = 0; idx < max; idx++) {
      if (idx % 3 === 0 && idx) {
        result += map2[bits >> 18 & 63];
        result += map2[bits >> 12 & 63];
        result += map2[bits >> 6 & 63];
        result += map2[bits & 63];
      }
      bits = (bits << 8) + object[idx];
    }
    tail = max % 3;
    if (tail === 0) {
      result += map2[bits >> 18 & 63];
      result += map2[bits >> 12 & 63];
      result += map2[bits >> 6 & 63];
      result += map2[bits & 63];
    } else if (tail === 2) {
      result += map2[bits >> 10 & 63];
      result += map2[bits >> 4 & 63];
      result += map2[bits << 2 & 63];
      result += map2[64];
    } else if (tail === 1) {
      result += map2[bits >> 2 & 63];
      result += map2[bits << 4 & 63];
      result += map2[64];
      result += map2[64];
    }
    return result;
  }
  function isBinary(obj) {
    return Object.prototype.toString.call(obj) === "[object Uint8Array]";
  }
  binary = new Type("tag:yaml.org,2002:binary", {
    kind: "scalar",
    resolve: resolveYamlBinary,
    construct: constructYamlBinary,
    predicate: isBinary,
    represent: representYamlBinary
  });
  return binary;
}
var omap;
var hasRequiredOmap;
function requireOmap() {
  if (hasRequiredOmap) return omap;
  hasRequiredOmap = 1;
  var Type = requireType();
  var _hasOwnProperty = Object.prototype.hasOwnProperty;
  var _toString = Object.prototype.toString;
  function resolveYamlOmap(data) {
    if (data === null) return true;
    var objectKeys = [], index, length, pair, pairKey, pairHasKey, object = data;
    for (index = 0, length = object.length; index < length; index += 1) {
      pair = object[index];
      pairHasKey = false;
      if (_toString.call(pair) !== "[object Object]") return false;
      for (pairKey in pair) {
        if (_hasOwnProperty.call(pair, pairKey)) {
          if (!pairHasKey) pairHasKey = true;
          else return false;
        }
      }
      if (!pairHasKey) return false;
      if (objectKeys.indexOf(pairKey) === -1) objectKeys.push(pairKey);
      else return false;
    }
    return true;
  }
  function constructYamlOmap(data) {
    return data !== null ? data : [];
  }
  omap = new Type("tag:yaml.org,2002:omap", {
    kind: "sequence",
    resolve: resolveYamlOmap,
    construct: constructYamlOmap
  });
  return omap;
}
var pairs;
var hasRequiredPairs;
function requirePairs() {
  if (hasRequiredPairs) return pairs;
  hasRequiredPairs = 1;
  var Type = requireType();
  var _toString = Object.prototype.toString;
  function resolveYamlPairs(data) {
    if (data === null) return true;
    var index, length, pair, keys, result, object = data;
    result = new Array(object.length);
    for (index = 0, length = object.length; index < length; index += 1) {
      pair = object[index];
      if (_toString.call(pair) !== "[object Object]") return false;
      keys = Object.keys(pair);
      if (keys.length !== 1) return false;
      result[index] = [keys[0], pair[keys[0]]];
    }
    return true;
  }
  function constructYamlPairs(data) {
    if (data === null) return [];
    var index, length, pair, keys, result, object = data;
    result = new Array(object.length);
    for (index = 0, length = object.length; index < length; index += 1) {
      pair = object[index];
      keys = Object.keys(pair);
      result[index] = [keys[0], pair[keys[0]]];
    }
    return result;
  }
  pairs = new Type("tag:yaml.org,2002:pairs", {
    kind: "sequence",
    resolve: resolveYamlPairs,
    construct: constructYamlPairs
  });
  return pairs;
}
var set;
var hasRequiredSet;
function requireSet() {
  if (hasRequiredSet) return set;
  hasRequiredSet = 1;
  var Type = requireType();
  var _hasOwnProperty = Object.prototype.hasOwnProperty;
  function resolveYamlSet(data) {
    if (data === null) return true;
    var key, object = data;
    for (key in object) {
      if (_hasOwnProperty.call(object, key)) {
        if (object[key] !== null) return false;
      }
    }
    return true;
  }
  function constructYamlSet(data) {
    return data !== null ? data : {};
  }
  set = new Type("tag:yaml.org,2002:set", {
    kind: "mapping",
    resolve: resolveYamlSet,
    construct: constructYamlSet
  });
  return set;
}
var _default;
var hasRequired_default;
function require_default() {
  if (hasRequired_default) return _default;
  hasRequired_default = 1;
  _default = requireCore().extend({
    implicit: [
      requireTimestamp(),
      requireMerge()
    ],
    explicit: [
      requireBinary(),
      requireOmap(),
      requirePairs(),
      requireSet()
    ]
  });
  return _default;
}
var hasRequiredLoader;
function requireLoader() {
  if (hasRequiredLoader) return loader;
  hasRequiredLoader = 1;
  var common2 = requireCommon();
  var YAMLException = requireException();
  var makeSnippet = requireSnippet();
  var DEFAULT_SCHEMA = require_default();
  var _hasOwnProperty = Object.prototype.hasOwnProperty;
  var CONTEXT_FLOW_IN = 1;
  var CONTEXT_FLOW_OUT = 2;
  var CONTEXT_BLOCK_IN = 3;
  var CONTEXT_BLOCK_OUT = 4;
  var CHOMPING_CLIP = 1;
  var CHOMPING_STRIP = 2;
  var CHOMPING_KEEP = 3;
  var PATTERN_NON_PRINTABLE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/;
  var PATTERN_NON_ASCII_LINE_BREAKS = /[\x85\u2028\u2029]/;
  var PATTERN_FLOW_INDICATORS = /[,\[\]\{\}]/;
  var PATTERN_TAG_HANDLE = /^(?:!|!!|![a-z\-]+!)$/i;
  var PATTERN_TAG_URI = /^(?:!|[^,\[\]\{\}])(?:%[0-9a-f]{2}|[0-9a-z\-#;\/\?:@&=\+\$,_\.!~\*'\(\)\[\]])*$/i;
  function _class(obj) {
    return Object.prototype.toString.call(obj);
  }
  function is_EOL(c) {
    return c === 10 || c === 13;
  }
  function is_WHITE_SPACE(c) {
    return c === 9 || c === 32;
  }
  function is_WS_OR_EOL(c) {
    return c === 9 || c === 32 || c === 10 || c === 13;
  }
  function is_FLOW_INDICATOR(c) {
    return c === 44 || c === 91 || c === 93 || c === 123 || c === 125;
  }
  function fromHexCode(c) {
    var lc;
    if (48 <= c && c <= 57) {
      return c - 48;
    }
    lc = c | 32;
    if (97 <= lc && lc <= 102) {
      return lc - 97 + 10;
    }
    return -1;
  }
  function escapedHexLen(c) {
    if (c === 120) {
      return 2;
    }
    if (c === 117) {
      return 4;
    }
    if (c === 85) {
      return 8;
    }
    return 0;
  }
  function fromDecimalCode(c) {
    if (48 <= c && c <= 57) {
      return c - 48;
    }
    return -1;
  }
  function simpleEscapeSequence(c) {
    return c === 48 ? "\0" : c === 97 ? "\x07" : c === 98 ? "\b" : c === 116 ? "	" : c === 9 ? "	" : c === 110 ? "\n" : c === 118 ? "\v" : c === 102 ? "\f" : c === 114 ? "\r" : c === 101 ? "\x1B" : c === 32 ? " " : c === 34 ? '"' : c === 47 ? "/" : c === 92 ? "\\" : c === 78 ? "" : c === 95 ? " " : c === 76 ? "\u2028" : c === 80 ? "\u2029" : "";
  }
  function charFromCodepoint(c) {
    if (c <= 65535) {
      return String.fromCharCode(c);
    }
    return String.fromCharCode(
      (c - 65536 >> 10) + 55296,
      (c - 65536 & 1023) + 56320
    );
  }
  var simpleEscapeCheck = new Array(256);
  var simpleEscapeMap = new Array(256);
  for (var i = 0; i < 256; i++) {
    simpleEscapeCheck[i] = simpleEscapeSequence(i) ? 1 : 0;
    simpleEscapeMap[i] = simpleEscapeSequence(i);
  }
  function State(input, options) {
    this.input = input;
    this.filename = options["filename"] || null;
    this.schema = options["schema"] || DEFAULT_SCHEMA;
    this.onWarning = options["onWarning"] || null;
    this.legacy = options["legacy"] || false;
    this.json = options["json"] || false;
    this.listener = options["listener"] || null;
    this.implicitTypes = this.schema.compiledImplicit;
    this.typeMap = this.schema.compiledTypeMap;
    this.length = input.length;
    this.position = 0;
    this.line = 0;
    this.lineStart = 0;
    this.lineIndent = 0;
    this.firstTabInLine = -1;
    this.documents = [];
  }
  function generateError(state, message) {
    var mark = {
      name: state.filename,
      buffer: state.input.slice(0, -1),
      // omit trailing \0
      position: state.position,
      line: state.line,
      column: state.position - state.lineStart
    };
    mark.snippet = makeSnippet(mark);
    return new YAMLException(message, mark);
  }
  function throwError(state, message) {
    throw generateError(state, message);
  }
  function throwWarning(state, message) {
    if (state.onWarning) {
      state.onWarning.call(null, generateError(state, message));
    }
  }
  var directiveHandlers = {
    YAML: function handleYamlDirective(state, name, args) {
      var match, major, minor;
      if (state.version !== null) {
        throwError(state, "duplication of %YAML directive");
      }
      if (args.length !== 1) {
        throwError(state, "YAML directive accepts exactly one argument");
      }
      match = /^([0-9]+)\.([0-9]+)$/.exec(args[0]);
      if (match === null) {
        throwError(state, "ill-formed argument of the YAML directive");
      }
      major = parseInt(match[1], 10);
      minor = parseInt(match[2], 10);
      if (major !== 1) {
        throwError(state, "unacceptable YAML version of the document");
      }
      state.version = args[0];
      state.checkLineBreaks = minor < 2;
      if (minor !== 1 && minor !== 2) {
        throwWarning(state, "unsupported YAML version of the document");
      }
    },
    TAG: function handleTagDirective(state, name, args) {
      var handle, prefix;
      if (args.length !== 2) {
        throwError(state, "TAG directive accepts exactly two arguments");
      }
      handle = args[0];
      prefix = args[1];
      if (!PATTERN_TAG_HANDLE.test(handle)) {
        throwError(state, "ill-formed tag handle (first argument) of the TAG directive");
      }
      if (_hasOwnProperty.call(state.tagMap, handle)) {
        throwError(state, 'there is a previously declared suffix for "' + handle + '" tag handle');
      }
      if (!PATTERN_TAG_URI.test(prefix)) {
        throwError(state, "ill-formed tag prefix (second argument) of the TAG directive");
      }
      try {
        prefix = decodeURIComponent(prefix);
      } catch (err) {
        throwError(state, "tag prefix is malformed: " + prefix);
      }
      state.tagMap[handle] = prefix;
    }
  };
  function captureSegment(state, start, end, checkJson) {
    var _position, _length, _character, _result;
    if (start < end) {
      _result = state.input.slice(start, end);
      if (checkJson) {
        for (_position = 0, _length = _result.length; _position < _length; _position += 1) {
          _character = _result.charCodeAt(_position);
          if (!(_character === 9 || 32 <= _character && _character <= 1114111)) {
            throwError(state, "expected valid JSON character");
          }
        }
      } else if (PATTERN_NON_PRINTABLE.test(_result)) {
        throwError(state, "the stream contains non-printable characters");
      }
      state.result += _result;
    }
  }
  function mergeMappings(state, destination, source, overridableKeys) {
    var sourceKeys, key, index, quantity;
    if (!common2.isObject(source)) {
      throwError(state, "cannot merge mappings; the provided source object is unacceptable");
    }
    sourceKeys = Object.keys(source);
    for (index = 0, quantity = sourceKeys.length; index < quantity; index += 1) {
      key = sourceKeys[index];
      if (!_hasOwnProperty.call(destination, key)) {
        destination[key] = source[key];
        overridableKeys[key] = true;
      }
    }
  }
  function storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, startLine, startLineStart, startPos) {
    var index, quantity;
    if (Array.isArray(keyNode)) {
      keyNode = Array.prototype.slice.call(keyNode);
      for (index = 0, quantity = keyNode.length; index < quantity; index += 1) {
        if (Array.isArray(keyNode[index])) {
          throwError(state, "nested arrays are not supported inside keys");
        }
        if (typeof keyNode === "object" && _class(keyNode[index]) === "[object Object]") {
          keyNode[index] = "[object Object]";
        }
      }
    }
    if (typeof keyNode === "object" && _class(keyNode) === "[object Object]") {
      keyNode = "[object Object]";
    }
    keyNode = String(keyNode);
    if (_result === null) {
      _result = {};
    }
    if (keyTag === "tag:yaml.org,2002:merge") {
      if (Array.isArray(valueNode)) {
        for (index = 0, quantity = valueNode.length; index < quantity; index += 1) {
          mergeMappings(state, _result, valueNode[index], overridableKeys);
        }
      } else {
        mergeMappings(state, _result, valueNode, overridableKeys);
      }
    } else {
      if (!state.json && !_hasOwnProperty.call(overridableKeys, keyNode) && _hasOwnProperty.call(_result, keyNode)) {
        state.line = startLine || state.line;
        state.lineStart = startLineStart || state.lineStart;
        state.position = startPos || state.position;
        throwError(state, "duplicated mapping key");
      }
      if (keyNode === "__proto__") {
        Object.defineProperty(_result, keyNode, {
          configurable: true,
          enumerable: true,
          writable: true,
          value: valueNode
        });
      } else {
        _result[keyNode] = valueNode;
      }
      delete overridableKeys[keyNode];
    }
    return _result;
  }
  function readLineBreak(state) {
    var ch;
    ch = state.input.charCodeAt(state.position);
    if (ch === 10) {
      state.position++;
    } else if (ch === 13) {
      state.position++;
      if (state.input.charCodeAt(state.position) === 10) {
        state.position++;
      }
    } else {
      throwError(state, "a line break is expected");
    }
    state.line += 1;
    state.lineStart = state.position;
    state.firstTabInLine = -1;
  }
  function skipSeparationSpace(state, allowComments, checkIndent) {
    var lineBreaks = 0, ch = state.input.charCodeAt(state.position);
    while (ch !== 0) {
      while (is_WHITE_SPACE(ch)) {
        if (ch === 9 && state.firstTabInLine === -1) {
          state.firstTabInLine = state.position;
        }
        ch = state.input.charCodeAt(++state.position);
      }
      if (allowComments && ch === 35) {
        do {
          ch = state.input.charCodeAt(++state.position);
        } while (ch !== 10 && ch !== 13 && ch !== 0);
      }
      if (is_EOL(ch)) {
        readLineBreak(state);
        ch = state.input.charCodeAt(state.position);
        lineBreaks++;
        state.lineIndent = 0;
        while (ch === 32) {
          state.lineIndent++;
          ch = state.input.charCodeAt(++state.position);
        }
      } else {
        break;
      }
    }
    if (checkIndent !== -1 && lineBreaks !== 0 && state.lineIndent < checkIndent) {
      throwWarning(state, "deficient indentation");
    }
    return lineBreaks;
  }
  function testDocumentSeparator(state) {
    var _position = state.position, ch;
    ch = state.input.charCodeAt(_position);
    if ((ch === 45 || ch === 46) && ch === state.input.charCodeAt(_position + 1) && ch === state.input.charCodeAt(_position + 2)) {
      _position += 3;
      ch = state.input.charCodeAt(_position);
      if (ch === 0 || is_WS_OR_EOL(ch)) {
        return true;
      }
    }
    return false;
  }
  function writeFoldedLines(state, count) {
    if (count === 1) {
      state.result += " ";
    } else if (count > 1) {
      state.result += common2.repeat("\n", count - 1);
    }
  }
  function readPlainScalar(state, nodeIndent, withinFlowCollection) {
    var preceding, following, captureStart, captureEnd, hasPendingContent, _line, _lineStart, _lineIndent, _kind = state.kind, _result = state.result, ch;
    ch = state.input.charCodeAt(state.position);
    if (is_WS_OR_EOL(ch) || is_FLOW_INDICATOR(ch) || ch === 35 || ch === 38 || ch === 42 || ch === 33 || ch === 124 || ch === 62 || ch === 39 || ch === 34 || ch === 37 || ch === 64 || ch === 96) {
      return false;
    }
    if (ch === 63 || ch === 45) {
      following = state.input.charCodeAt(state.position + 1);
      if (is_WS_OR_EOL(following) || withinFlowCollection && is_FLOW_INDICATOR(following)) {
        return false;
      }
    }
    state.kind = "scalar";
    state.result = "";
    captureStart = captureEnd = state.position;
    hasPendingContent = false;
    while (ch !== 0) {
      if (ch === 58) {
        following = state.input.charCodeAt(state.position + 1);
        if (is_WS_OR_EOL(following) || withinFlowCollection && is_FLOW_INDICATOR(following)) {
          break;
        }
      } else if (ch === 35) {
        preceding = state.input.charCodeAt(state.position - 1);
        if (is_WS_OR_EOL(preceding)) {
          break;
        }
      } else if (state.position === state.lineStart && testDocumentSeparator(state) || withinFlowCollection && is_FLOW_INDICATOR(ch)) {
        break;
      } else if (is_EOL(ch)) {
        _line = state.line;
        _lineStart = state.lineStart;
        _lineIndent = state.lineIndent;
        skipSeparationSpace(state, false, -1);
        if (state.lineIndent >= nodeIndent) {
          hasPendingContent = true;
          ch = state.input.charCodeAt(state.position);
          continue;
        } else {
          state.position = captureEnd;
          state.line = _line;
          state.lineStart = _lineStart;
          state.lineIndent = _lineIndent;
          break;
        }
      }
      if (hasPendingContent) {
        captureSegment(state, captureStart, captureEnd, false);
        writeFoldedLines(state, state.line - _line);
        captureStart = captureEnd = state.position;
        hasPendingContent = false;
      }
      if (!is_WHITE_SPACE(ch)) {
        captureEnd = state.position + 1;
      }
      ch = state.input.charCodeAt(++state.position);
    }
    captureSegment(state, captureStart, captureEnd, false);
    if (state.result) {
      return true;
    }
    state.kind = _kind;
    state.result = _result;
    return false;
  }
  function readSingleQuotedScalar(state, nodeIndent) {
    var ch, captureStart, captureEnd;
    ch = state.input.charCodeAt(state.position);
    if (ch !== 39) {
      return false;
    }
    state.kind = "scalar";
    state.result = "";
    state.position++;
    captureStart = captureEnd = state.position;
    while ((ch = state.input.charCodeAt(state.position)) !== 0) {
      if (ch === 39) {
        captureSegment(state, captureStart, state.position, true);
        ch = state.input.charCodeAt(++state.position);
        if (ch === 39) {
          captureStart = state.position;
          state.position++;
          captureEnd = state.position;
        } else {
          return true;
        }
      } else if (is_EOL(ch)) {
        captureSegment(state, captureStart, captureEnd, true);
        writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
        captureStart = captureEnd = state.position;
      } else if (state.position === state.lineStart && testDocumentSeparator(state)) {
        throwError(state, "unexpected end of the document within a single quoted scalar");
      } else {
        state.position++;
        captureEnd = state.position;
      }
    }
    throwError(state, "unexpected end of the stream within a single quoted scalar");
  }
  function readDoubleQuotedScalar(state, nodeIndent) {
    var captureStart, captureEnd, hexLength, hexResult, tmp, ch;
    ch = state.input.charCodeAt(state.position);
    if (ch !== 34) {
      return false;
    }
    state.kind = "scalar";
    state.result = "";
    state.position++;
    captureStart = captureEnd = state.position;
    while ((ch = state.input.charCodeAt(state.position)) !== 0) {
      if (ch === 34) {
        captureSegment(state, captureStart, state.position, true);
        state.position++;
        return true;
      } else if (ch === 92) {
        captureSegment(state, captureStart, state.position, true);
        ch = state.input.charCodeAt(++state.position);
        if (is_EOL(ch)) {
          skipSeparationSpace(state, false, nodeIndent);
        } else if (ch < 256 && simpleEscapeCheck[ch]) {
          state.result += simpleEscapeMap[ch];
          state.position++;
        } else if ((tmp = escapedHexLen(ch)) > 0) {
          hexLength = tmp;
          hexResult = 0;
          for (; hexLength > 0; hexLength--) {
            ch = state.input.charCodeAt(++state.position);
            if ((tmp = fromHexCode(ch)) >= 0) {
              hexResult = (hexResult << 4) + tmp;
            } else {
              throwError(state, "expected hexadecimal character");
            }
          }
          state.result += charFromCodepoint(hexResult);
          state.position++;
        } else {
          throwError(state, "unknown escape sequence");
        }
        captureStart = captureEnd = state.position;
      } else if (is_EOL(ch)) {
        captureSegment(state, captureStart, captureEnd, true);
        writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
        captureStart = captureEnd = state.position;
      } else if (state.position === state.lineStart && testDocumentSeparator(state)) {
        throwError(state, "unexpected end of the document within a double quoted scalar");
      } else {
        state.position++;
        captureEnd = state.position;
      }
    }
    throwError(state, "unexpected end of the stream within a double quoted scalar");
  }
  function readFlowCollection(state, nodeIndent) {
    var readNext = true, _line, _lineStart, _pos, _tag = state.tag, _result, _anchor = state.anchor, following, terminator, isPair, isExplicitPair, isMapping, overridableKeys = /* @__PURE__ */ Object.create(null), keyNode, keyTag, valueNode, ch;
    ch = state.input.charCodeAt(state.position);
    if (ch === 91) {
      terminator = 93;
      isMapping = false;
      _result = [];
    } else if (ch === 123) {
      terminator = 125;
      isMapping = true;
      _result = {};
    } else {
      return false;
    }
    if (state.anchor !== null) {
      state.anchorMap[state.anchor] = _result;
    }
    ch = state.input.charCodeAt(++state.position);
    while (ch !== 0) {
      skipSeparationSpace(state, true, nodeIndent);
      ch = state.input.charCodeAt(state.position);
      if (ch === terminator) {
        state.position++;
        state.tag = _tag;
        state.anchor = _anchor;
        state.kind = isMapping ? "mapping" : "sequence";
        state.result = _result;
        return true;
      } else if (!readNext) {
        throwError(state, "missed comma between flow collection entries");
      } else if (ch === 44) {
        throwError(state, "expected the node content, but found ','");
      }
      keyTag = keyNode = valueNode = null;
      isPair = isExplicitPair = false;
      if (ch === 63) {
        following = state.input.charCodeAt(state.position + 1);
        if (is_WS_OR_EOL(following)) {
          isPair = isExplicitPair = true;
          state.position++;
          skipSeparationSpace(state, true, nodeIndent);
        }
      }
      _line = state.line;
      _lineStart = state.lineStart;
      _pos = state.position;
      composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
      keyTag = state.tag;
      keyNode = state.result;
      skipSeparationSpace(state, true, nodeIndent);
      ch = state.input.charCodeAt(state.position);
      if ((isExplicitPair || state.line === _line) && ch === 58) {
        isPair = true;
        ch = state.input.charCodeAt(++state.position);
        skipSeparationSpace(state, true, nodeIndent);
        composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
        valueNode = state.result;
      }
      if (isMapping) {
        storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, _line, _lineStart, _pos);
      } else if (isPair) {
        _result.push(storeMappingPair(state, null, overridableKeys, keyTag, keyNode, valueNode, _line, _lineStart, _pos));
      } else {
        _result.push(keyNode);
      }
      skipSeparationSpace(state, true, nodeIndent);
      ch = state.input.charCodeAt(state.position);
      if (ch === 44) {
        readNext = true;
        ch = state.input.charCodeAt(++state.position);
      } else {
        readNext = false;
      }
    }
    throwError(state, "unexpected end of the stream within a flow collection");
  }
  function readBlockScalar(state, nodeIndent) {
    var captureStart, folding, chomping = CHOMPING_CLIP, didReadContent = false, detectedIndent = false, textIndent = nodeIndent, emptyLines = 0, atMoreIndented = false, tmp, ch;
    ch = state.input.charCodeAt(state.position);
    if (ch === 124) {
      folding = false;
    } else if (ch === 62) {
      folding = true;
    } else {
      return false;
    }
    state.kind = "scalar";
    state.result = "";
    while (ch !== 0) {
      ch = state.input.charCodeAt(++state.position);
      if (ch === 43 || ch === 45) {
        if (CHOMPING_CLIP === chomping) {
          chomping = ch === 43 ? CHOMPING_KEEP : CHOMPING_STRIP;
        } else {
          throwError(state, "repeat of a chomping mode identifier");
        }
      } else if ((tmp = fromDecimalCode(ch)) >= 0) {
        if (tmp === 0) {
          throwError(state, "bad explicit indentation width of a block scalar; it cannot be less than one");
        } else if (!detectedIndent) {
          textIndent = nodeIndent + tmp - 1;
          detectedIndent = true;
        } else {
          throwError(state, "repeat of an indentation width identifier");
        }
      } else {
        break;
      }
    }
    if (is_WHITE_SPACE(ch)) {
      do {
        ch = state.input.charCodeAt(++state.position);
      } while (is_WHITE_SPACE(ch));
      if (ch === 35) {
        do {
          ch = state.input.charCodeAt(++state.position);
        } while (!is_EOL(ch) && ch !== 0);
      }
    }
    while (ch !== 0) {
      readLineBreak(state);
      state.lineIndent = 0;
      ch = state.input.charCodeAt(state.position);
      while ((!detectedIndent || state.lineIndent < textIndent) && ch === 32) {
        state.lineIndent++;
        ch = state.input.charCodeAt(++state.position);
      }
      if (!detectedIndent && state.lineIndent > textIndent) {
        textIndent = state.lineIndent;
      }
      if (is_EOL(ch)) {
        emptyLines++;
        continue;
      }
      if (state.lineIndent < textIndent) {
        if (chomping === CHOMPING_KEEP) {
          state.result += common2.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
        } else if (chomping === CHOMPING_CLIP) {
          if (didReadContent) {
            state.result += "\n";
          }
        }
        break;
      }
      if (folding) {
        if (is_WHITE_SPACE(ch)) {
          atMoreIndented = true;
          state.result += common2.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
        } else if (atMoreIndented) {
          atMoreIndented = false;
          state.result += common2.repeat("\n", emptyLines + 1);
        } else if (emptyLines === 0) {
          if (didReadContent) {
            state.result += " ";
          }
        } else {
          state.result += common2.repeat("\n", emptyLines);
        }
      } else {
        state.result += common2.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
      }
      didReadContent = true;
      detectedIndent = true;
      emptyLines = 0;
      captureStart = state.position;
      while (!is_EOL(ch) && ch !== 0) {
        ch = state.input.charCodeAt(++state.position);
      }
      captureSegment(state, captureStart, state.position, false);
    }
    return true;
  }
  function readBlockSequence(state, nodeIndent) {
    var _line, _tag = state.tag, _anchor = state.anchor, _result = [], following, detected = false, ch;
    if (state.firstTabInLine !== -1) return false;
    if (state.anchor !== null) {
      state.anchorMap[state.anchor] = _result;
    }
    ch = state.input.charCodeAt(state.position);
    while (ch !== 0) {
      if (state.firstTabInLine !== -1) {
        state.position = state.firstTabInLine;
        throwError(state, "tab characters must not be used in indentation");
      }
      if (ch !== 45) {
        break;
      }
      following = state.input.charCodeAt(state.position + 1);
      if (!is_WS_OR_EOL(following)) {
        break;
      }
      detected = true;
      state.position++;
      if (skipSeparationSpace(state, true, -1)) {
        if (state.lineIndent <= nodeIndent) {
          _result.push(null);
          ch = state.input.charCodeAt(state.position);
          continue;
        }
      }
      _line = state.line;
      composeNode(state, nodeIndent, CONTEXT_BLOCK_IN, false, true);
      _result.push(state.result);
      skipSeparationSpace(state, true, -1);
      ch = state.input.charCodeAt(state.position);
      if ((state.line === _line || state.lineIndent > nodeIndent) && ch !== 0) {
        throwError(state, "bad indentation of a sequence entry");
      } else if (state.lineIndent < nodeIndent) {
        break;
      }
    }
    if (detected) {
      state.tag = _tag;
      state.anchor = _anchor;
      state.kind = "sequence";
      state.result = _result;
      return true;
    }
    return false;
  }
  function readBlockMapping(state, nodeIndent, flowIndent) {
    var following, allowCompact, _line, _keyLine, _keyLineStart, _keyPos, _tag = state.tag, _anchor = state.anchor, _result = {}, overridableKeys = /* @__PURE__ */ Object.create(null), keyTag = null, keyNode = null, valueNode = null, atExplicitKey = false, detected = false, ch;
    if (state.firstTabInLine !== -1) return false;
    if (state.anchor !== null) {
      state.anchorMap[state.anchor] = _result;
    }
    ch = state.input.charCodeAt(state.position);
    while (ch !== 0) {
      if (!atExplicitKey && state.firstTabInLine !== -1) {
        state.position = state.firstTabInLine;
        throwError(state, "tab characters must not be used in indentation");
      }
      following = state.input.charCodeAt(state.position + 1);
      _line = state.line;
      if ((ch === 63 || ch === 58) && is_WS_OR_EOL(following)) {
        if (ch === 63) {
          if (atExplicitKey) {
            storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
            keyTag = keyNode = valueNode = null;
          }
          detected = true;
          atExplicitKey = true;
          allowCompact = true;
        } else if (atExplicitKey) {
          atExplicitKey = false;
          allowCompact = true;
        } else {
          throwError(state, "incomplete explicit mapping pair; a key node is missed; or followed by a non-tabulated empty line");
        }
        state.position += 1;
        ch = following;
      } else {
        _keyLine = state.line;
        _keyLineStart = state.lineStart;
        _keyPos = state.position;
        if (!composeNode(state, flowIndent, CONTEXT_FLOW_OUT, false, true)) {
          break;
        }
        if (state.line === _line) {
          ch = state.input.charCodeAt(state.position);
          while (is_WHITE_SPACE(ch)) {
            ch = state.input.charCodeAt(++state.position);
          }
          if (ch === 58) {
            ch = state.input.charCodeAt(++state.position);
            if (!is_WS_OR_EOL(ch)) {
              throwError(state, "a whitespace character is expected after the key-value separator within a block mapping");
            }
            if (atExplicitKey) {
              storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
              keyTag = keyNode = valueNode = null;
            }
            detected = true;
            atExplicitKey = false;
            allowCompact = false;
            keyTag = state.tag;
            keyNode = state.result;
          } else if (detected) {
            throwError(state, "can not read an implicit mapping pair; a colon is missed");
          } else {
            state.tag = _tag;
            state.anchor = _anchor;
            return true;
          }
        } else if (detected) {
          throwError(state, "can not read a block mapping entry; a multiline key may not be an implicit key");
        } else {
          state.tag = _tag;
          state.anchor = _anchor;
          return true;
        }
      }
      if (state.line === _line || state.lineIndent > nodeIndent) {
        if (atExplicitKey) {
          _keyLine = state.line;
          _keyLineStart = state.lineStart;
          _keyPos = state.position;
        }
        if (composeNode(state, nodeIndent, CONTEXT_BLOCK_OUT, true, allowCompact)) {
          if (atExplicitKey) {
            keyNode = state.result;
          } else {
            valueNode = state.result;
          }
        }
        if (!atExplicitKey) {
          storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, _keyLine, _keyLineStart, _keyPos);
          keyTag = keyNode = valueNode = null;
        }
        skipSeparationSpace(state, true, -1);
        ch = state.input.charCodeAt(state.position);
      }
      if ((state.line === _line || state.lineIndent > nodeIndent) && ch !== 0) {
        throwError(state, "bad indentation of a mapping entry");
      } else if (state.lineIndent < nodeIndent) {
        break;
      }
    }
    if (atExplicitKey) {
      storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
    }
    if (detected) {
      state.tag = _tag;
      state.anchor = _anchor;
      state.kind = "mapping";
      state.result = _result;
    }
    return detected;
  }
  function readTagProperty(state) {
    var _position, isVerbatim = false, isNamed = false, tagHandle, tagName, ch;
    ch = state.input.charCodeAt(state.position);
    if (ch !== 33) return false;
    if (state.tag !== null) {
      throwError(state, "duplication of a tag property");
    }
    ch = state.input.charCodeAt(++state.position);
    if (ch === 60) {
      isVerbatim = true;
      ch = state.input.charCodeAt(++state.position);
    } else if (ch === 33) {
      isNamed = true;
      tagHandle = "!!";
      ch = state.input.charCodeAt(++state.position);
    } else {
      tagHandle = "!";
    }
    _position = state.position;
    if (isVerbatim) {
      do {
        ch = state.input.charCodeAt(++state.position);
      } while (ch !== 0 && ch !== 62);
      if (state.position < state.length) {
        tagName = state.input.slice(_position, state.position);
        ch = state.input.charCodeAt(++state.position);
      } else {
        throwError(state, "unexpected end of the stream within a verbatim tag");
      }
    } else {
      while (ch !== 0 && !is_WS_OR_EOL(ch)) {
        if (ch === 33) {
          if (!isNamed) {
            tagHandle = state.input.slice(_position - 1, state.position + 1);
            if (!PATTERN_TAG_HANDLE.test(tagHandle)) {
              throwError(state, "named tag handle cannot contain such characters");
            }
            isNamed = true;
            _position = state.position + 1;
          } else {
            throwError(state, "tag suffix cannot contain exclamation marks");
          }
        }
        ch = state.input.charCodeAt(++state.position);
      }
      tagName = state.input.slice(_position, state.position);
      if (PATTERN_FLOW_INDICATORS.test(tagName)) {
        throwError(state, "tag suffix cannot contain flow indicator characters");
      }
    }
    if (tagName && !PATTERN_TAG_URI.test(tagName)) {
      throwError(state, "tag name cannot contain such characters: " + tagName);
    }
    try {
      tagName = decodeURIComponent(tagName);
    } catch (err) {
      throwError(state, "tag name is malformed: " + tagName);
    }
    if (isVerbatim) {
      state.tag = tagName;
    } else if (_hasOwnProperty.call(state.tagMap, tagHandle)) {
      state.tag = state.tagMap[tagHandle] + tagName;
    } else if (tagHandle === "!") {
      state.tag = "!" + tagName;
    } else if (tagHandle === "!!") {
      state.tag = "tag:yaml.org,2002:" + tagName;
    } else {
      throwError(state, 'undeclared tag handle "' + tagHandle + '"');
    }
    return true;
  }
  function readAnchorProperty(state) {
    var _position, ch;
    ch = state.input.charCodeAt(state.position);
    if (ch !== 38) return false;
    if (state.anchor !== null) {
      throwError(state, "duplication of an anchor property");
    }
    ch = state.input.charCodeAt(++state.position);
    _position = state.position;
    while (ch !== 0 && !is_WS_OR_EOL(ch) && !is_FLOW_INDICATOR(ch)) {
      ch = state.input.charCodeAt(++state.position);
    }
    if (state.position === _position) {
      throwError(state, "name of an anchor node must contain at least one character");
    }
    state.anchor = state.input.slice(_position, state.position);
    return true;
  }
  function readAlias(state) {
    var _position, alias, ch;
    ch = state.input.charCodeAt(state.position);
    if (ch !== 42) return false;
    ch = state.input.charCodeAt(++state.position);
    _position = state.position;
    while (ch !== 0 && !is_WS_OR_EOL(ch) && !is_FLOW_INDICATOR(ch)) {
      ch = state.input.charCodeAt(++state.position);
    }
    if (state.position === _position) {
      throwError(state, "name of an alias node must contain at least one character");
    }
    alias = state.input.slice(_position, state.position);
    if (!_hasOwnProperty.call(state.anchorMap, alias)) {
      throwError(state, 'unidentified alias "' + alias + '"');
    }
    state.result = state.anchorMap[alias];
    skipSeparationSpace(state, true, -1);
    return true;
  }
  function composeNode(state, parentIndent, nodeContext, allowToSeek, allowCompact) {
    var allowBlockStyles, allowBlockScalars, allowBlockCollections, indentStatus = 1, atNewLine = false, hasContent = false, typeIndex, typeQuantity, typeList, type2, flowIndent, blockIndent;
    if (state.listener !== null) {
      state.listener("open", state);
    }
    state.tag = null;
    state.anchor = null;
    state.kind = null;
    state.result = null;
    allowBlockStyles = allowBlockScalars = allowBlockCollections = CONTEXT_BLOCK_OUT === nodeContext || CONTEXT_BLOCK_IN === nodeContext;
    if (allowToSeek) {
      if (skipSeparationSpace(state, true, -1)) {
        atNewLine = true;
        if (state.lineIndent > parentIndent) {
          indentStatus = 1;
        } else if (state.lineIndent === parentIndent) {
          indentStatus = 0;
        } else if (state.lineIndent < parentIndent) {
          indentStatus = -1;
        }
      }
    }
    if (indentStatus === 1) {
      while (readTagProperty(state) || readAnchorProperty(state)) {
        if (skipSeparationSpace(state, true, -1)) {
          atNewLine = true;
          allowBlockCollections = allowBlockStyles;
          if (state.lineIndent > parentIndent) {
            indentStatus = 1;
          } else if (state.lineIndent === parentIndent) {
            indentStatus = 0;
          } else if (state.lineIndent < parentIndent) {
            indentStatus = -1;
          }
        } else {
          allowBlockCollections = false;
        }
      }
    }
    if (allowBlockCollections) {
      allowBlockCollections = atNewLine || allowCompact;
    }
    if (indentStatus === 1 || CONTEXT_BLOCK_OUT === nodeContext) {
      if (CONTEXT_FLOW_IN === nodeContext || CONTEXT_FLOW_OUT === nodeContext) {
        flowIndent = parentIndent;
      } else {
        flowIndent = parentIndent + 1;
      }
      blockIndent = state.position - state.lineStart;
      if (indentStatus === 1) {
        if (allowBlockCollections && (readBlockSequence(state, blockIndent) || readBlockMapping(state, blockIndent, flowIndent)) || readFlowCollection(state, flowIndent)) {
          hasContent = true;
        } else {
          if (allowBlockScalars && readBlockScalar(state, flowIndent) || readSingleQuotedScalar(state, flowIndent) || readDoubleQuotedScalar(state, flowIndent)) {
            hasContent = true;
          } else if (readAlias(state)) {
            hasContent = true;
            if (state.tag !== null || state.anchor !== null) {
              throwError(state, "alias node should not have any properties");
            }
          } else if (readPlainScalar(state, flowIndent, CONTEXT_FLOW_IN === nodeContext)) {
            hasContent = true;
            if (state.tag === null) {
              state.tag = "?";
            }
          }
          if (state.anchor !== null) {
            state.anchorMap[state.anchor] = state.result;
          }
        }
      } else if (indentStatus === 0) {
        hasContent = allowBlockCollections && readBlockSequence(state, blockIndent);
      }
    }
    if (state.tag === null) {
      if (state.anchor !== null) {
        state.anchorMap[state.anchor] = state.result;
      }
    } else if (state.tag === "?") {
      if (state.result !== null && state.kind !== "scalar") {
        throwError(state, 'unacceptable node kind for !<?> tag; it should be "scalar", not "' + state.kind + '"');
      }
      for (typeIndex = 0, typeQuantity = state.implicitTypes.length; typeIndex < typeQuantity; typeIndex += 1) {
        type2 = state.implicitTypes[typeIndex];
        if (type2.resolve(state.result)) {
          state.result = type2.construct(state.result);
          state.tag = type2.tag;
          if (state.anchor !== null) {
            state.anchorMap[state.anchor] = state.result;
          }
          break;
        }
      }
    } else if (state.tag !== "!") {
      if (_hasOwnProperty.call(state.typeMap[state.kind || "fallback"], state.tag)) {
        type2 = state.typeMap[state.kind || "fallback"][state.tag];
      } else {
        type2 = null;
        typeList = state.typeMap.multi[state.kind || "fallback"];
        for (typeIndex = 0, typeQuantity = typeList.length; typeIndex < typeQuantity; typeIndex += 1) {
          if (state.tag.slice(0, typeList[typeIndex].tag.length) === typeList[typeIndex].tag) {
            type2 = typeList[typeIndex];
            break;
          }
        }
      }
      if (!type2) {
        throwError(state, "unknown tag !<" + state.tag + ">");
      }
      if (state.result !== null && type2.kind !== state.kind) {
        throwError(state, "unacceptable node kind for !<" + state.tag + '> tag; it should be "' + type2.kind + '", not "' + state.kind + '"');
      }
      if (!type2.resolve(state.result, state.tag)) {
        throwError(state, "cannot resolve a node with !<" + state.tag + "> explicit tag");
      } else {
        state.result = type2.construct(state.result, state.tag);
        if (state.anchor !== null) {
          state.anchorMap[state.anchor] = state.result;
        }
      }
    }
    if (state.listener !== null) {
      state.listener("close", state);
    }
    return state.tag !== null || state.anchor !== null || hasContent;
  }
  function readDocument(state) {
    var documentStart = state.position, _position, directiveName, directiveArgs, hasDirectives = false, ch;
    state.version = null;
    state.checkLineBreaks = state.legacy;
    state.tagMap = /* @__PURE__ */ Object.create(null);
    state.anchorMap = /* @__PURE__ */ Object.create(null);
    while ((ch = state.input.charCodeAt(state.position)) !== 0) {
      skipSeparationSpace(state, true, -1);
      ch = state.input.charCodeAt(state.position);
      if (state.lineIndent > 0 || ch !== 37) {
        break;
      }
      hasDirectives = true;
      ch = state.input.charCodeAt(++state.position);
      _position = state.position;
      while (ch !== 0 && !is_WS_OR_EOL(ch)) {
        ch = state.input.charCodeAt(++state.position);
      }
      directiveName = state.input.slice(_position, state.position);
      directiveArgs = [];
      if (directiveName.length < 1) {
        throwError(state, "directive name must not be less than one character in length");
      }
      while (ch !== 0) {
        while (is_WHITE_SPACE(ch)) {
          ch = state.input.charCodeAt(++state.position);
        }
        if (ch === 35) {
          do {
            ch = state.input.charCodeAt(++state.position);
          } while (ch !== 0 && !is_EOL(ch));
          break;
        }
        if (is_EOL(ch)) break;
        _position = state.position;
        while (ch !== 0 && !is_WS_OR_EOL(ch)) {
          ch = state.input.charCodeAt(++state.position);
        }
        directiveArgs.push(state.input.slice(_position, state.position));
      }
      if (ch !== 0) readLineBreak(state);
      if (_hasOwnProperty.call(directiveHandlers, directiveName)) {
        directiveHandlers[directiveName](state, directiveName, directiveArgs);
      } else {
        throwWarning(state, 'unknown document directive "' + directiveName + '"');
      }
    }
    skipSeparationSpace(state, true, -1);
    if (state.lineIndent === 0 && state.input.charCodeAt(state.position) === 45 && state.input.charCodeAt(state.position + 1) === 45 && state.input.charCodeAt(state.position + 2) === 45) {
      state.position += 3;
      skipSeparationSpace(state, true, -1);
    } else if (hasDirectives) {
      throwError(state, "directives end mark is expected");
    }
    composeNode(state, state.lineIndent - 1, CONTEXT_BLOCK_OUT, false, true);
    skipSeparationSpace(state, true, -1);
    if (state.checkLineBreaks && PATTERN_NON_ASCII_LINE_BREAKS.test(state.input.slice(documentStart, state.position))) {
      throwWarning(state, "non-ASCII line breaks are interpreted as content");
    }
    state.documents.push(state.result);
    if (state.position === state.lineStart && testDocumentSeparator(state)) {
      if (state.input.charCodeAt(state.position) === 46) {
        state.position += 3;
        skipSeparationSpace(state, true, -1);
      }
      return;
    }
    if (state.position < state.length - 1) {
      throwError(state, "end of the stream or a document separator is expected");
    } else {
      return;
    }
  }
  function loadDocuments(input, options) {
    input = String(input);
    options = options || {};
    if (input.length !== 0) {
      if (input.charCodeAt(input.length - 1) !== 10 && input.charCodeAt(input.length - 1) !== 13) {
        input += "\n";
      }
      if (input.charCodeAt(0) === 65279) {
        input = input.slice(1);
      }
    }
    var state = new State(input, options);
    var nullpos = input.indexOf("\0");
    if (nullpos !== -1) {
      state.position = nullpos;
      throwError(state, "null byte is not allowed in input");
    }
    state.input += "\0";
    while (state.input.charCodeAt(state.position) === 32) {
      state.lineIndent += 1;
      state.position += 1;
    }
    while (state.position < state.length - 1) {
      readDocument(state);
    }
    return state.documents;
  }
  function loadAll(input, iterator, options) {
    if (iterator !== null && typeof iterator === "object" && typeof options === "undefined") {
      options = iterator;
      iterator = null;
    }
    var documents = loadDocuments(input, options);
    if (typeof iterator !== "function") {
      return documents;
    }
    for (var index = 0, length = documents.length; index < length; index += 1) {
      iterator(documents[index]);
    }
  }
  function load(input, options) {
    var documents = loadDocuments(input, options);
    if (documents.length === 0) {
      return void 0;
    } else if (documents.length === 1) {
      return documents[0];
    }
    throw new YAMLException("expected a single document in the stream, but found more");
  }
  loader.loadAll = loadAll;
  loader.load = load;
  return loader;
}
var dumper = {};
var hasRequiredDumper;
function requireDumper() {
  if (hasRequiredDumper) return dumper;
  hasRequiredDumper = 1;
  var common2 = requireCommon();
  var YAMLException = requireException();
  var DEFAULT_SCHEMA = require_default();
  var _toString = Object.prototype.toString;
  var _hasOwnProperty = Object.prototype.hasOwnProperty;
  var CHAR_BOM = 65279;
  var CHAR_TAB = 9;
  var CHAR_LINE_FEED = 10;
  var CHAR_CARRIAGE_RETURN = 13;
  var CHAR_SPACE = 32;
  var CHAR_EXCLAMATION = 33;
  var CHAR_DOUBLE_QUOTE = 34;
  var CHAR_SHARP = 35;
  var CHAR_PERCENT = 37;
  var CHAR_AMPERSAND = 38;
  var CHAR_SINGLE_QUOTE = 39;
  var CHAR_ASTERISK = 42;
  var CHAR_COMMA = 44;
  var CHAR_MINUS = 45;
  var CHAR_COLON = 58;
  var CHAR_EQUALS = 61;
  var CHAR_GREATER_THAN = 62;
  var CHAR_QUESTION = 63;
  var CHAR_COMMERCIAL_AT = 64;
  var CHAR_LEFT_SQUARE_BRACKET = 91;
  var CHAR_RIGHT_SQUARE_BRACKET = 93;
  var CHAR_GRAVE_ACCENT = 96;
  var CHAR_LEFT_CURLY_BRACKET = 123;
  var CHAR_VERTICAL_LINE = 124;
  var CHAR_RIGHT_CURLY_BRACKET = 125;
  var ESCAPE_SEQUENCES = {};
  ESCAPE_SEQUENCES[0] = "\\0";
  ESCAPE_SEQUENCES[7] = "\\a";
  ESCAPE_SEQUENCES[8] = "\\b";
  ESCAPE_SEQUENCES[9] = "\\t";
  ESCAPE_SEQUENCES[10] = "\\n";
  ESCAPE_SEQUENCES[11] = "\\v";
  ESCAPE_SEQUENCES[12] = "\\f";
  ESCAPE_SEQUENCES[13] = "\\r";
  ESCAPE_SEQUENCES[27] = "\\e";
  ESCAPE_SEQUENCES[34] = '\\"';
  ESCAPE_SEQUENCES[92] = "\\\\";
  ESCAPE_SEQUENCES[133] = "\\N";
  ESCAPE_SEQUENCES[160] = "\\_";
  ESCAPE_SEQUENCES[8232] = "\\L";
  ESCAPE_SEQUENCES[8233] = "\\P";
  var DEPRECATED_BOOLEANS_SYNTAX = [
    "y",
    "Y",
    "yes",
    "Yes",
    "YES",
    "on",
    "On",
    "ON",
    "n",
    "N",
    "no",
    "No",
    "NO",
    "off",
    "Off",
    "OFF"
  ];
  var DEPRECATED_BASE60_SYNTAX = /^[-+]?[0-9_]+(?::[0-9_]+)+(?:\.[0-9_]*)?$/;
  function compileStyleMap(schema2, map2) {
    var result, keys, index, length, tag, style, type2;
    if (map2 === null) return {};
    result = {};
    keys = Object.keys(map2);
    for (index = 0, length = keys.length; index < length; index += 1) {
      tag = keys[index];
      style = String(map2[tag]);
      if (tag.slice(0, 2) === "!!") {
        tag = "tag:yaml.org,2002:" + tag.slice(2);
      }
      type2 = schema2.compiledTypeMap["fallback"][tag];
      if (type2 && _hasOwnProperty.call(type2.styleAliases, style)) {
        style = type2.styleAliases[style];
      }
      result[tag] = style;
    }
    return result;
  }
  function encodeHex(character) {
    var string, handle, length;
    string = character.toString(16).toUpperCase();
    if (character <= 255) {
      handle = "x";
      length = 2;
    } else if (character <= 65535) {
      handle = "u";
      length = 4;
    } else if (character <= 4294967295) {
      handle = "U";
      length = 8;
    } else {
      throw new YAMLException("code point within a string may not be greater than 0xFFFFFFFF");
    }
    return "\\" + handle + common2.repeat("0", length - string.length) + string;
  }
  var QUOTING_TYPE_SINGLE = 1, QUOTING_TYPE_DOUBLE = 2;
  function State(options) {
    this.schema = options["schema"] || DEFAULT_SCHEMA;
    this.indent = Math.max(1, options["indent"] || 2);
    this.noArrayIndent = options["noArrayIndent"] || false;
    this.skipInvalid = options["skipInvalid"] || false;
    this.flowLevel = common2.isNothing(options["flowLevel"]) ? -1 : options["flowLevel"];
    this.styleMap = compileStyleMap(this.schema, options["styles"] || null);
    this.sortKeys = options["sortKeys"] || false;
    this.lineWidth = options["lineWidth"] || 80;
    this.noRefs = options["noRefs"] || false;
    this.noCompatMode = options["noCompatMode"] || false;
    this.condenseFlow = options["condenseFlow"] || false;
    this.quotingType = options["quotingType"] === '"' ? QUOTING_TYPE_DOUBLE : QUOTING_TYPE_SINGLE;
    this.forceQuotes = options["forceQuotes"] || false;
    this.replacer = typeof options["replacer"] === "function" ? options["replacer"] : null;
    this.implicitTypes = this.schema.compiledImplicit;
    this.explicitTypes = this.schema.compiledExplicit;
    this.tag = null;
    this.result = "";
    this.duplicates = [];
    this.usedDuplicates = null;
  }
  function indentString(string, spaces) {
    var ind = common2.repeat(" ", spaces), position = 0, next = -1, result = "", line, length = string.length;
    while (position < length) {
      next = string.indexOf("\n", position);
      if (next === -1) {
        line = string.slice(position);
        position = length;
      } else {
        line = string.slice(position, next + 1);
        position = next + 1;
      }
      if (line.length && line !== "\n") result += ind;
      result += line;
    }
    return result;
  }
  function generateNextLine(state, level) {
    return "\n" + common2.repeat(" ", state.indent * level);
  }
  function testImplicitResolving(state, str2) {
    var index, length, type2;
    for (index = 0, length = state.implicitTypes.length; index < length; index += 1) {
      type2 = state.implicitTypes[index];
      if (type2.resolve(str2)) {
        return true;
      }
    }
    return false;
  }
  function isWhitespace(c) {
    return c === CHAR_SPACE || c === CHAR_TAB;
  }
  function isPrintable(c) {
    return 32 <= c && c <= 126 || 161 <= c && c <= 55295 && c !== 8232 && c !== 8233 || 57344 <= c && c <= 65533 && c !== CHAR_BOM || 65536 <= c && c <= 1114111;
  }
  function isNsCharOrWhitespace(c) {
    return isPrintable(c) && c !== CHAR_BOM && c !== CHAR_CARRIAGE_RETURN && c !== CHAR_LINE_FEED;
  }
  function isPlainSafe(c, prev, inblock) {
    var cIsNsCharOrWhitespace = isNsCharOrWhitespace(c);
    var cIsNsChar = cIsNsCharOrWhitespace && !isWhitespace(c);
    return (
      // ns-plain-safe
      (inblock ? (
        // c = flow-in
        cIsNsCharOrWhitespace
      ) : cIsNsCharOrWhitespace && c !== CHAR_COMMA && c !== CHAR_LEFT_SQUARE_BRACKET && c !== CHAR_RIGHT_SQUARE_BRACKET && c !== CHAR_LEFT_CURLY_BRACKET && c !== CHAR_RIGHT_CURLY_BRACKET) && c !== CHAR_SHARP && !(prev === CHAR_COLON && !cIsNsChar) || isNsCharOrWhitespace(prev) && !isWhitespace(prev) && c === CHAR_SHARP || prev === CHAR_COLON && cIsNsChar
    );
  }
  function isPlainSafeFirst(c) {
    return isPrintable(c) && c !== CHAR_BOM && !isWhitespace(c) && c !== CHAR_MINUS && c !== CHAR_QUESTION && c !== CHAR_COLON && c !== CHAR_COMMA && c !== CHAR_LEFT_SQUARE_BRACKET && c !== CHAR_RIGHT_SQUARE_BRACKET && c !== CHAR_LEFT_CURLY_BRACKET && c !== CHAR_RIGHT_CURLY_BRACKET && c !== CHAR_SHARP && c !== CHAR_AMPERSAND && c !== CHAR_ASTERISK && c !== CHAR_EXCLAMATION && c !== CHAR_VERTICAL_LINE && c !== CHAR_EQUALS && c !== CHAR_GREATER_THAN && c !== CHAR_SINGLE_QUOTE && c !== CHAR_DOUBLE_QUOTE && c !== CHAR_PERCENT && c !== CHAR_COMMERCIAL_AT && c !== CHAR_GRAVE_ACCENT;
  }
  function isPlainSafeLast(c) {
    return !isWhitespace(c) && c !== CHAR_COLON;
  }
  function codePointAt(string, pos) {
    var first = string.charCodeAt(pos), second;
    if (first >= 55296 && first <= 56319 && pos + 1 < string.length) {
      second = string.charCodeAt(pos + 1);
      if (second >= 56320 && second <= 57343) {
        return (first - 55296) * 1024 + second - 56320 + 65536;
      }
    }
    return first;
  }
  function needIndentIndicator(string) {
    var leadingSpaceRe = /^\n* /;
    return leadingSpaceRe.test(string);
  }
  var STYLE_PLAIN = 1, STYLE_SINGLE = 2, STYLE_LITERAL = 3, STYLE_FOLDED = 4, STYLE_DOUBLE = 5;
  function chooseScalarStyle(string, singleLineOnly, indentPerLevel, lineWidth, testAmbiguousType, quotingType, forceQuotes, inblock) {
    var i;
    var char = 0;
    var prevChar = null;
    var hasLineBreak = false;
    var hasFoldableLine = false;
    var shouldTrackWidth = lineWidth !== -1;
    var previousLineBreak = -1;
    var plain = isPlainSafeFirst(codePointAt(string, 0)) && isPlainSafeLast(codePointAt(string, string.length - 1));
    if (singleLineOnly || forceQuotes) {
      for (i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
        char = codePointAt(string, i);
        if (!isPrintable(char)) {
          return STYLE_DOUBLE;
        }
        plain = plain && isPlainSafe(char, prevChar, inblock);
        prevChar = char;
      }
    } else {
      for (i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
        char = codePointAt(string, i);
        if (char === CHAR_LINE_FEED) {
          hasLineBreak = true;
          if (shouldTrackWidth) {
            hasFoldableLine = hasFoldableLine || // Foldable line = too long, and not more-indented.
            i - previousLineBreak - 1 > lineWidth && string[previousLineBreak + 1] !== " ";
            previousLineBreak = i;
          }
        } else if (!isPrintable(char)) {
          return STYLE_DOUBLE;
        }
        plain = plain && isPlainSafe(char, prevChar, inblock);
        prevChar = char;
      }
      hasFoldableLine = hasFoldableLine || shouldTrackWidth && (i - previousLineBreak - 1 > lineWidth && string[previousLineBreak + 1] !== " ");
    }
    if (!hasLineBreak && !hasFoldableLine) {
      if (plain && !forceQuotes && !testAmbiguousType(string)) {
        return STYLE_PLAIN;
      }
      return quotingType === QUOTING_TYPE_DOUBLE ? STYLE_DOUBLE : STYLE_SINGLE;
    }
    if (indentPerLevel > 9 && needIndentIndicator(string)) {
      return STYLE_DOUBLE;
    }
    if (!forceQuotes) {
      return hasFoldableLine ? STYLE_FOLDED : STYLE_LITERAL;
    }
    return quotingType === QUOTING_TYPE_DOUBLE ? STYLE_DOUBLE : STYLE_SINGLE;
  }
  function writeScalar(state, string, level, iskey, inblock) {
    state.dump = (function() {
      if (string.length === 0) {
        return state.quotingType === QUOTING_TYPE_DOUBLE ? '""' : "''";
      }
      if (!state.noCompatMode) {
        if (DEPRECATED_BOOLEANS_SYNTAX.indexOf(string) !== -1 || DEPRECATED_BASE60_SYNTAX.test(string)) {
          return state.quotingType === QUOTING_TYPE_DOUBLE ? '"' + string + '"' : "'" + string + "'";
        }
      }
      var indent = state.indent * Math.max(1, level);
      var lineWidth = state.lineWidth === -1 ? -1 : Math.max(Math.min(state.lineWidth, 40), state.lineWidth - indent);
      var singleLineOnly = iskey || state.flowLevel > -1 && level >= state.flowLevel;
      function testAmbiguity(string2) {
        return testImplicitResolving(state, string2);
      }
      switch (chooseScalarStyle(
        string,
        singleLineOnly,
        state.indent,
        lineWidth,
        testAmbiguity,
        state.quotingType,
        state.forceQuotes && !iskey,
        inblock
      )) {
        case STYLE_PLAIN:
          return string;
        case STYLE_SINGLE:
          return "'" + string.replace(/'/g, "''") + "'";
        case STYLE_LITERAL:
          return "|" + blockHeader(string, state.indent) + dropEndingNewline(indentString(string, indent));
        case STYLE_FOLDED:
          return ">" + blockHeader(string, state.indent) + dropEndingNewline(indentString(foldString(string, lineWidth), indent));
        case STYLE_DOUBLE:
          return '"' + escapeString(string) + '"';
        default:
          throw new YAMLException("impossible error: invalid scalar style");
      }
    })();
  }
  function blockHeader(string, indentPerLevel) {
    var indentIndicator = needIndentIndicator(string) ? String(indentPerLevel) : "";
    var clip = string[string.length - 1] === "\n";
    var keep = clip && (string[string.length - 2] === "\n" || string === "\n");
    var chomp = keep ? "+" : clip ? "" : "-";
    return indentIndicator + chomp + "\n";
  }
  function dropEndingNewline(string) {
    return string[string.length - 1] === "\n" ? string.slice(0, -1) : string;
  }
  function foldString(string, width) {
    var lineRe = /(\n+)([^\n]*)/g;
    var result = (function() {
      var nextLF = string.indexOf("\n");
      nextLF = nextLF !== -1 ? nextLF : string.length;
      lineRe.lastIndex = nextLF;
      return foldLine(string.slice(0, nextLF), width);
    })();
    var prevMoreIndented = string[0] === "\n" || string[0] === " ";
    var moreIndented;
    var match;
    while (match = lineRe.exec(string)) {
      var prefix = match[1], line = match[2];
      moreIndented = line[0] === " ";
      result += prefix + (!prevMoreIndented && !moreIndented && line !== "" ? "\n" : "") + foldLine(line, width);
      prevMoreIndented = moreIndented;
    }
    return result;
  }
  function foldLine(line, width) {
    if (line === "" || line[0] === " ") return line;
    var breakRe = / [^ ]/g;
    var match;
    var start = 0, end, curr = 0, next = 0;
    var result = "";
    while (match = breakRe.exec(line)) {
      next = match.index;
      if (next - start > width) {
        end = curr > start ? curr : next;
        result += "\n" + line.slice(start, end);
        start = end + 1;
      }
      curr = next;
    }
    result += "\n";
    if (line.length - start > width && curr > start) {
      result += line.slice(start, curr) + "\n" + line.slice(curr + 1);
    } else {
      result += line.slice(start);
    }
    return result.slice(1);
  }
  function escapeString(string) {
    var result = "";
    var char = 0;
    var escapeSeq;
    for (var i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
      char = codePointAt(string, i);
      escapeSeq = ESCAPE_SEQUENCES[char];
      if (!escapeSeq && isPrintable(char)) {
        result += string[i];
        if (char >= 65536) result += string[i + 1];
      } else {
        result += escapeSeq || encodeHex(char);
      }
    }
    return result;
  }
  function writeFlowSequence(state, level, object) {
    var _result = "", _tag = state.tag, index, length, value;
    for (index = 0, length = object.length; index < length; index += 1) {
      value = object[index];
      if (state.replacer) {
        value = state.replacer.call(object, String(index), value);
      }
      if (writeNode(state, level, value, false, false) || typeof value === "undefined" && writeNode(state, level, null, false, false)) {
        if (_result !== "") _result += "," + (!state.condenseFlow ? " " : "");
        _result += state.dump;
      }
    }
    state.tag = _tag;
    state.dump = "[" + _result + "]";
  }
  function writeBlockSequence(state, level, object, compact) {
    var _result = "", _tag = state.tag, index, length, value;
    for (index = 0, length = object.length; index < length; index += 1) {
      value = object[index];
      if (state.replacer) {
        value = state.replacer.call(object, String(index), value);
      }
      if (writeNode(state, level + 1, value, true, true, false, true) || typeof value === "undefined" && writeNode(state, level + 1, null, true, true, false, true)) {
        if (!compact || _result !== "") {
          _result += generateNextLine(state, level);
        }
        if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
          _result += "-";
        } else {
          _result += "- ";
        }
        _result += state.dump;
      }
    }
    state.tag = _tag;
    state.dump = _result || "[]";
  }
  function writeFlowMapping(state, level, object) {
    var _result = "", _tag = state.tag, objectKeyList = Object.keys(object), index, length, objectKey, objectValue, pairBuffer;
    for (index = 0, length = objectKeyList.length; index < length; index += 1) {
      pairBuffer = "";
      if (_result !== "") pairBuffer += ", ";
      if (state.condenseFlow) pairBuffer += '"';
      objectKey = objectKeyList[index];
      objectValue = object[objectKey];
      if (state.replacer) {
        objectValue = state.replacer.call(object, objectKey, objectValue);
      }
      if (!writeNode(state, level, objectKey, false, false)) {
        continue;
      }
      if (state.dump.length > 1024) pairBuffer += "? ";
      pairBuffer += state.dump + (state.condenseFlow ? '"' : "") + ":" + (state.condenseFlow ? "" : " ");
      if (!writeNode(state, level, objectValue, false, false)) {
        continue;
      }
      pairBuffer += state.dump;
      _result += pairBuffer;
    }
    state.tag = _tag;
    state.dump = "{" + _result + "}";
  }
  function writeBlockMapping(state, level, object, compact) {
    var _result = "", _tag = state.tag, objectKeyList = Object.keys(object), index, length, objectKey, objectValue, explicitPair, pairBuffer;
    if (state.sortKeys === true) {
      objectKeyList.sort();
    } else if (typeof state.sortKeys === "function") {
      objectKeyList.sort(state.sortKeys);
    } else if (state.sortKeys) {
      throw new YAMLException("sortKeys must be a boolean or a function");
    }
    for (index = 0, length = objectKeyList.length; index < length; index += 1) {
      pairBuffer = "";
      if (!compact || _result !== "") {
        pairBuffer += generateNextLine(state, level);
      }
      objectKey = objectKeyList[index];
      objectValue = object[objectKey];
      if (state.replacer) {
        objectValue = state.replacer.call(object, objectKey, objectValue);
      }
      if (!writeNode(state, level + 1, objectKey, true, true, true)) {
        continue;
      }
      explicitPair = state.tag !== null && state.tag !== "?" || state.dump && state.dump.length > 1024;
      if (explicitPair) {
        if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
          pairBuffer += "?";
        } else {
          pairBuffer += "? ";
        }
      }
      pairBuffer += state.dump;
      if (explicitPair) {
        pairBuffer += generateNextLine(state, level);
      }
      if (!writeNode(state, level + 1, objectValue, true, explicitPair)) {
        continue;
      }
      if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
        pairBuffer += ":";
      } else {
        pairBuffer += ": ";
      }
      pairBuffer += state.dump;
      _result += pairBuffer;
    }
    state.tag = _tag;
    state.dump = _result || "{}";
  }
  function detectType(state, object, explicit) {
    var _result, typeList, index, length, type2, style;
    typeList = explicit ? state.explicitTypes : state.implicitTypes;
    for (index = 0, length = typeList.length; index < length; index += 1) {
      type2 = typeList[index];
      if ((type2.instanceOf || type2.predicate) && (!type2.instanceOf || typeof object === "object" && object instanceof type2.instanceOf) && (!type2.predicate || type2.predicate(object))) {
        if (explicit) {
          if (type2.multi && type2.representName) {
            state.tag = type2.representName(object);
          } else {
            state.tag = type2.tag;
          }
        } else {
          state.tag = "?";
        }
        if (type2.represent) {
          style = state.styleMap[type2.tag] || type2.defaultStyle;
          if (_toString.call(type2.represent) === "[object Function]") {
            _result = type2.represent(object, style);
          } else if (_hasOwnProperty.call(type2.represent, style)) {
            _result = type2.represent[style](object, style);
          } else {
            throw new YAMLException("!<" + type2.tag + '> tag resolver accepts not "' + style + '" style');
          }
          state.dump = _result;
        }
        return true;
      }
    }
    return false;
  }
  function writeNode(state, level, object, block, compact, iskey, isblockseq) {
    state.tag = null;
    state.dump = object;
    if (!detectType(state, object, false)) {
      detectType(state, object, true);
    }
    var type2 = _toString.call(state.dump);
    var inblock = block;
    var tagStr;
    if (block) {
      block = state.flowLevel < 0 || state.flowLevel > level;
    }
    var objectOrArray = type2 === "[object Object]" || type2 === "[object Array]", duplicateIndex, duplicate;
    if (objectOrArray) {
      duplicateIndex = state.duplicates.indexOf(object);
      duplicate = duplicateIndex !== -1;
    }
    if (state.tag !== null && state.tag !== "?" || duplicate || state.indent !== 2 && level > 0) {
      compact = false;
    }
    if (duplicate && state.usedDuplicates[duplicateIndex]) {
      state.dump = "*ref_" + duplicateIndex;
    } else {
      if (objectOrArray && duplicate && !state.usedDuplicates[duplicateIndex]) {
        state.usedDuplicates[duplicateIndex] = true;
      }
      if (type2 === "[object Object]") {
        if (block && Object.keys(state.dump).length !== 0) {
          writeBlockMapping(state, level, state.dump, compact);
          if (duplicate) {
            state.dump = "&ref_" + duplicateIndex + state.dump;
          }
        } else {
          writeFlowMapping(state, level, state.dump);
          if (duplicate) {
            state.dump = "&ref_" + duplicateIndex + " " + state.dump;
          }
        }
      } else if (type2 === "[object Array]") {
        if (block && state.dump.length !== 0) {
          if (state.noArrayIndent && !isblockseq && level > 0) {
            writeBlockSequence(state, level - 1, state.dump, compact);
          } else {
            writeBlockSequence(state, level, state.dump, compact);
          }
          if (duplicate) {
            state.dump = "&ref_" + duplicateIndex + state.dump;
          }
        } else {
          writeFlowSequence(state, level, state.dump);
          if (duplicate) {
            state.dump = "&ref_" + duplicateIndex + " " + state.dump;
          }
        }
      } else if (type2 === "[object String]") {
        if (state.tag !== "?") {
          writeScalar(state, state.dump, level, iskey, inblock);
        }
      } else if (type2 === "[object Undefined]") {
        return false;
      } else {
        if (state.skipInvalid) return false;
        throw new YAMLException("unacceptable kind of an object to dump " + type2);
      }
      if (state.tag !== null && state.tag !== "?") {
        tagStr = encodeURI(
          state.tag[0] === "!" ? state.tag.slice(1) : state.tag
        ).replace(/!/g, "%21");
        if (state.tag[0] === "!") {
          tagStr = "!" + tagStr;
        } else if (tagStr.slice(0, 18) === "tag:yaml.org,2002:") {
          tagStr = "!!" + tagStr.slice(18);
        } else {
          tagStr = "!<" + tagStr + ">";
        }
        state.dump = tagStr + " " + state.dump;
      }
    }
    return true;
  }
  function getDuplicateReferences(object, state) {
    var objects = [], duplicatesIndexes = [], index, length;
    inspectNode(object, objects, duplicatesIndexes);
    for (index = 0, length = duplicatesIndexes.length; index < length; index += 1) {
      state.duplicates.push(objects[duplicatesIndexes[index]]);
    }
    state.usedDuplicates = new Array(length);
  }
  function inspectNode(object, objects, duplicatesIndexes) {
    var objectKeyList, index, length;
    if (object !== null && typeof object === "object") {
      index = objects.indexOf(object);
      if (index !== -1) {
        if (duplicatesIndexes.indexOf(index) === -1) {
          duplicatesIndexes.push(index);
        }
      } else {
        objects.push(object);
        if (Array.isArray(object)) {
          for (index = 0, length = object.length; index < length; index += 1) {
            inspectNode(object[index], objects, duplicatesIndexes);
          }
        } else {
          objectKeyList = Object.keys(object);
          for (index = 0, length = objectKeyList.length; index < length; index += 1) {
            inspectNode(object[objectKeyList[index]], objects, duplicatesIndexes);
          }
        }
      }
    }
  }
  function dump(input, options) {
    options = options || {};
    var state = new State(options);
    if (!state.noRefs) getDuplicateReferences(input, state);
    var value = input;
    if (state.replacer) {
      value = state.replacer.call({ "": value }, "", value);
    }
    if (writeNode(state, 0, value, true, true)) return state.dump + "\n";
    return "";
  }
  dumper.dump = dump;
  return dumper;
}
var hasRequiredJsYaml;
function requireJsYaml() {
  if (hasRequiredJsYaml) return jsYaml;
  hasRequiredJsYaml = 1;
  var loader2 = requireLoader();
  var dumper2 = requireDumper();
  function renamed(from, to) {
    return function() {
      throw new Error("Function yaml." + from + " is removed in js-yaml 4. Use yaml." + to + " instead, which is now safe by default.");
    };
  }
  jsYaml.Type = requireType();
  jsYaml.Schema = requireSchema();
  jsYaml.FAILSAFE_SCHEMA = requireFailsafe();
  jsYaml.JSON_SCHEMA = requireJson();
  jsYaml.CORE_SCHEMA = requireCore();
  jsYaml.DEFAULT_SCHEMA = require_default();
  jsYaml.load = loader2.load;
  jsYaml.loadAll = loader2.loadAll;
  jsYaml.dump = dumper2.dump;
  jsYaml.YAMLException = requireException();
  jsYaml.types = {
    binary: requireBinary(),
    float: requireFloat(),
    map: requireMap(),
    null: require_null(),
    pairs: requirePairs(),
    set: requireSet(),
    timestamp: requireTimestamp(),
    bool: requireBool(),
    int: requireInt(),
    merge: requireMerge(),
    omap: requireOmap(),
    seq: requireSeq(),
    str: requireStr()
  };
  jsYaml.safeLoad = renamed("safeLoad", "load");
  jsYaml.safeLoadAll = renamed("safeLoadAll", "loadAll");
  jsYaml.safeDump = renamed("safeDump", "dump");
  return jsYaml;
}
var main = {};
var hasRequiredMain$1;
function requireMain$1() {
  if (hasRequiredMain$1) return main;
  hasRequiredMain$1 = 1;
  Object.defineProperty(main, "__esModule", { value: true });
  main.Lazy = void 0;
  class Lazy {
    constructor(creator) {
      this._value = null;
      this.creator = creator;
    }
    get hasValue() {
      return this.creator == null;
    }
    get value() {
      if (this.creator == null) {
        return this._value;
      }
      const result = this.creator();
      this.value = result;
      return result;
    }
    set value(value) {
      this._value = value;
      this.creator = null;
    }
  }
  main.Lazy = Lazy;
  return main;
}
var re = { exports: {} };
var constants;
var hasRequiredConstants;
function requireConstants() {
  if (hasRequiredConstants) return constants;
  hasRequiredConstants = 1;
  const SEMVER_SPEC_VERSION = "2.0.0";
  const MAX_LENGTH = 256;
  const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER || /* istanbul ignore next */
  9007199254740991;
  const MAX_SAFE_COMPONENT_LENGTH = 16;
  const MAX_SAFE_BUILD_LENGTH = MAX_LENGTH - 6;
  const RELEASE_TYPES = [
    "major",
    "premajor",
    "minor",
    "preminor",
    "patch",
    "prepatch",
    "prerelease"
  ];
  constants = {
    MAX_LENGTH,
    MAX_SAFE_COMPONENT_LENGTH,
    MAX_SAFE_BUILD_LENGTH,
    MAX_SAFE_INTEGER,
    RELEASE_TYPES,
    SEMVER_SPEC_VERSION,
    FLAG_INCLUDE_PRERELEASE: 1,
    FLAG_LOOSE: 2
  };
  return constants;
}
var debug_1;
var hasRequiredDebug;
function requireDebug() {
  if (hasRequiredDebug) return debug_1;
  hasRequiredDebug = 1;
  const debug = typeof process === "object" && process.env && process.env.NODE_DEBUG && /\bsemver\b/i.test(process.env.NODE_DEBUG) ? (...args) => console.error("SEMVER", ...args) : () => {
  };
  debug_1 = debug;
  return debug_1;
}
var hasRequiredRe;
function requireRe() {
  if (hasRequiredRe) return re.exports;
  hasRequiredRe = 1;
  (function(module, exports) {
    const {
      MAX_SAFE_COMPONENT_LENGTH,
      MAX_SAFE_BUILD_LENGTH,
      MAX_LENGTH
    } = requireConstants();
    const debug = requireDebug();
    exports = module.exports = {};
    const re2 = exports.re = [];
    const safeRe = exports.safeRe = [];
    const src2 = exports.src = [];
    const safeSrc = exports.safeSrc = [];
    const t = exports.t = {};
    let R = 0;
    const LETTERDASHNUMBER = "[a-zA-Z0-9-]";
    const safeRegexReplacements = [
      ["\\s", 1],
      ["\\d", MAX_LENGTH],
      [LETTERDASHNUMBER, MAX_SAFE_BUILD_LENGTH]
    ];
    const makeSafeRegex = (value) => {
      for (const [token, max] of safeRegexReplacements) {
        value = value.split(`${token}*`).join(`${token}{0,${max}}`).split(`${token}+`).join(`${token}{1,${max}}`);
      }
      return value;
    };
    const createToken = (name, value, isGlobal) => {
      const safe = makeSafeRegex(value);
      const index = R++;
      debug(name, index, value);
      t[name] = index;
      src2[index] = value;
      safeSrc[index] = safe;
      re2[index] = new RegExp(value, isGlobal ? "g" : void 0);
      safeRe[index] = new RegExp(safe, isGlobal ? "g" : void 0);
    };
    createToken("NUMERICIDENTIFIER", "0|[1-9]\\d*");
    createToken("NUMERICIDENTIFIERLOOSE", "\\d+");
    createToken("NONNUMERICIDENTIFIER", `\\d*[a-zA-Z-]${LETTERDASHNUMBER}*`);
    createToken("MAINVERSION", `(${src2[t.NUMERICIDENTIFIER]})\\.(${src2[t.NUMERICIDENTIFIER]})\\.(${src2[t.NUMERICIDENTIFIER]})`);
    createToken("MAINVERSIONLOOSE", `(${src2[t.NUMERICIDENTIFIERLOOSE]})\\.(${src2[t.NUMERICIDENTIFIERLOOSE]})\\.(${src2[t.NUMERICIDENTIFIERLOOSE]})`);
    createToken("PRERELEASEIDENTIFIER", `(?:${src2[t.NONNUMERICIDENTIFIER]}|${src2[t.NUMERICIDENTIFIER]})`);
    createToken("PRERELEASEIDENTIFIERLOOSE", `(?:${src2[t.NONNUMERICIDENTIFIER]}|${src2[t.NUMERICIDENTIFIERLOOSE]})`);
    createToken("PRERELEASE", `(?:-(${src2[t.PRERELEASEIDENTIFIER]}(?:\\.${src2[t.PRERELEASEIDENTIFIER]})*))`);
    createToken("PRERELEASELOOSE", `(?:-?(${src2[t.PRERELEASEIDENTIFIERLOOSE]}(?:\\.${src2[t.PRERELEASEIDENTIFIERLOOSE]})*))`);
    createToken("BUILDIDENTIFIER", `${LETTERDASHNUMBER}+`);
    createToken("BUILD", `(?:\\+(${src2[t.BUILDIDENTIFIER]}(?:\\.${src2[t.BUILDIDENTIFIER]})*))`);
    createToken("FULLPLAIN", `v?${src2[t.MAINVERSION]}${src2[t.PRERELEASE]}?${src2[t.BUILD]}?`);
    createToken("FULL", `^${src2[t.FULLPLAIN]}$`);
    createToken("LOOSEPLAIN", `[v=\\s]*${src2[t.MAINVERSIONLOOSE]}${src2[t.PRERELEASELOOSE]}?${src2[t.BUILD]}?`);
    createToken("LOOSE", `^${src2[t.LOOSEPLAIN]}$`);
    createToken("GTLT", "((?:<|>)?=?)");
    createToken("XRANGEIDENTIFIERLOOSE", `${src2[t.NUMERICIDENTIFIERLOOSE]}|x|X|\\*`);
    createToken("XRANGEIDENTIFIER", `${src2[t.NUMERICIDENTIFIER]}|x|X|\\*`);
    createToken("XRANGEPLAIN", `[v=\\s]*(${src2[t.XRANGEIDENTIFIER]})(?:\\.(${src2[t.XRANGEIDENTIFIER]})(?:\\.(${src2[t.XRANGEIDENTIFIER]})(?:${src2[t.PRERELEASE]})?${src2[t.BUILD]}?)?)?`);
    createToken("XRANGEPLAINLOOSE", `[v=\\s]*(${src2[t.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src2[t.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src2[t.XRANGEIDENTIFIERLOOSE]})(?:${src2[t.PRERELEASELOOSE]})?${src2[t.BUILD]}?)?)?`);
    createToken("XRANGE", `^${src2[t.GTLT]}\\s*${src2[t.XRANGEPLAIN]}$`);
    createToken("XRANGELOOSE", `^${src2[t.GTLT]}\\s*${src2[t.XRANGEPLAINLOOSE]}$`);
    createToken("COERCEPLAIN", `${"(^|[^\\d])(\\d{1,"}${MAX_SAFE_COMPONENT_LENGTH}})(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?`);
    createToken("COERCE", `${src2[t.COERCEPLAIN]}(?:$|[^\\d])`);
    createToken("COERCEFULL", src2[t.COERCEPLAIN] + `(?:${src2[t.PRERELEASE]})?(?:${src2[t.BUILD]})?(?:$|[^\\d])`);
    createToken("COERCERTL", src2[t.COERCE], true);
    createToken("COERCERTLFULL", src2[t.COERCEFULL], true);
    createToken("LONETILDE", "(?:~>?)");
    createToken("TILDETRIM", `(\\s*)${src2[t.LONETILDE]}\\s+`, true);
    exports.tildeTrimReplace = "$1~";
    createToken("TILDE", `^${src2[t.LONETILDE]}${src2[t.XRANGEPLAIN]}$`);
    createToken("TILDELOOSE", `^${src2[t.LONETILDE]}${src2[t.XRANGEPLAINLOOSE]}$`);
    createToken("LONECARET", "(?:\\^)");
    createToken("CARETTRIM", `(\\s*)${src2[t.LONECARET]}\\s+`, true);
    exports.caretTrimReplace = "$1^";
    createToken("CARET", `^${src2[t.LONECARET]}${src2[t.XRANGEPLAIN]}$`);
    createToken("CARETLOOSE", `^${src2[t.LONECARET]}${src2[t.XRANGEPLAINLOOSE]}$`);
    createToken("COMPARATORLOOSE", `^${src2[t.GTLT]}\\s*(${src2[t.LOOSEPLAIN]})$|^$`);
    createToken("COMPARATOR", `^${src2[t.GTLT]}\\s*(${src2[t.FULLPLAIN]})$|^$`);
    createToken("COMPARATORTRIM", `(\\s*)${src2[t.GTLT]}\\s*(${src2[t.LOOSEPLAIN]}|${src2[t.XRANGEPLAIN]})`, true);
    exports.comparatorTrimReplace = "$1$2$3";
    createToken("HYPHENRANGE", `^\\s*(${src2[t.XRANGEPLAIN]})\\s+-\\s+(${src2[t.XRANGEPLAIN]})\\s*$`);
    createToken("HYPHENRANGELOOSE", `^\\s*(${src2[t.XRANGEPLAINLOOSE]})\\s+-\\s+(${src2[t.XRANGEPLAINLOOSE]})\\s*$`);
    createToken("STAR", "(<|>)?=?\\s*\\*");
    createToken("GTE0", "^\\s*>=\\s*0\\.0\\.0\\s*$");
    createToken("GTE0PRE", "^\\s*>=\\s*0\\.0\\.0-0\\s*$");
  })(re, re.exports);
  return re.exports;
}
var parseOptions_1;
var hasRequiredParseOptions;
function requireParseOptions() {
  if (hasRequiredParseOptions) return parseOptions_1;
  hasRequiredParseOptions = 1;
  const looseOption = Object.freeze({ loose: true });
  const emptyOpts = Object.freeze({});
  const parseOptions = (options) => {
    if (!options) {
      return emptyOpts;
    }
    if (typeof options !== "object") {
      return looseOption;
    }
    return options;
  };
  parseOptions_1 = parseOptions;
  return parseOptions_1;
}
var identifiers;
var hasRequiredIdentifiers;
function requireIdentifiers() {
  if (hasRequiredIdentifiers) return identifiers;
  hasRequiredIdentifiers = 1;
  const numeric = /^[0-9]+$/;
  const compareIdentifiers = (a, b) => {
    const anum = numeric.test(a);
    const bnum = numeric.test(b);
    if (anum && bnum) {
      a = +a;
      b = +b;
    }
    return a === b ? 0 : anum && !bnum ? -1 : bnum && !anum ? 1 : a < b ? -1 : 1;
  };
  const rcompareIdentifiers = (a, b) => compareIdentifiers(b, a);
  identifiers = {
    compareIdentifiers,
    rcompareIdentifiers
  };
  return identifiers;
}
var semver$1;
var hasRequiredSemver$1;
function requireSemver$1() {
  if (hasRequiredSemver$1) return semver$1;
  hasRequiredSemver$1 = 1;
  const debug = requireDebug();
  const { MAX_LENGTH, MAX_SAFE_INTEGER } = requireConstants();
  const { safeRe: re2, t } = requireRe();
  const parseOptions = requireParseOptions();
  const { compareIdentifiers } = requireIdentifiers();
  class SemVer {
    constructor(version, options) {
      options = parseOptions(options);
      if (version instanceof SemVer) {
        if (version.loose === !!options.loose && version.includePrerelease === !!options.includePrerelease) {
          return version;
        } else {
          version = version.version;
        }
      } else if (typeof version !== "string") {
        throw new TypeError(`Invalid version. Must be a string. Got type "${typeof version}".`);
      }
      if (version.length > MAX_LENGTH) {
        throw new TypeError(
          `version is longer than ${MAX_LENGTH} characters`
        );
      }
      debug("SemVer", version, options);
      this.options = options;
      this.loose = !!options.loose;
      this.includePrerelease = !!options.includePrerelease;
      const m = version.trim().match(options.loose ? re2[t.LOOSE] : re2[t.FULL]);
      if (!m) {
        throw new TypeError(`Invalid Version: ${version}`);
      }
      this.raw = version;
      this.major = +m[1];
      this.minor = +m[2];
      this.patch = +m[3];
      if (this.major > MAX_SAFE_INTEGER || this.major < 0) {
        throw new TypeError("Invalid major version");
      }
      if (this.minor > MAX_SAFE_INTEGER || this.minor < 0) {
        throw new TypeError("Invalid minor version");
      }
      if (this.patch > MAX_SAFE_INTEGER || this.patch < 0) {
        throw new TypeError("Invalid patch version");
      }
      if (!m[4]) {
        this.prerelease = [];
      } else {
        this.prerelease = m[4].split(".").map((id) => {
          if (/^[0-9]+$/.test(id)) {
            const num = +id;
            if (num >= 0 && num < MAX_SAFE_INTEGER) {
              return num;
            }
          }
          return id;
        });
      }
      this.build = m[5] ? m[5].split(".") : [];
      this.format();
    }
    format() {
      this.version = `${this.major}.${this.minor}.${this.patch}`;
      if (this.prerelease.length) {
        this.version += `-${this.prerelease.join(".")}`;
      }
      return this.version;
    }
    toString() {
      return this.version;
    }
    compare(other) {
      debug("SemVer.compare", this.version, this.options, other);
      if (!(other instanceof SemVer)) {
        if (typeof other === "string" && other === this.version) {
          return 0;
        }
        other = new SemVer(other, this.options);
      }
      if (other.version === this.version) {
        return 0;
      }
      return this.compareMain(other) || this.comparePre(other);
    }
    compareMain(other) {
      if (!(other instanceof SemVer)) {
        other = new SemVer(other, this.options);
      }
      return compareIdentifiers(this.major, other.major) || compareIdentifiers(this.minor, other.minor) || compareIdentifiers(this.patch, other.patch);
    }
    comparePre(other) {
      if (!(other instanceof SemVer)) {
        other = new SemVer(other, this.options);
      }
      if (this.prerelease.length && !other.prerelease.length) {
        return -1;
      } else if (!this.prerelease.length && other.prerelease.length) {
        return 1;
      } else if (!this.prerelease.length && !other.prerelease.length) {
        return 0;
      }
      let i = 0;
      do {
        const a = this.prerelease[i];
        const b = other.prerelease[i];
        debug("prerelease compare", i, a, b);
        if (a === void 0 && b === void 0) {
          return 0;
        } else if (b === void 0) {
          return 1;
        } else if (a === void 0) {
          return -1;
        } else if (a === b) {
          continue;
        } else {
          return compareIdentifiers(a, b);
        }
      } while (++i);
    }
    compareBuild(other) {
      if (!(other instanceof SemVer)) {
        other = new SemVer(other, this.options);
      }
      let i = 0;
      do {
        const a = this.build[i];
        const b = other.build[i];
        debug("build compare", i, a, b);
        if (a === void 0 && b === void 0) {
          return 0;
        } else if (b === void 0) {
          return 1;
        } else if (a === void 0) {
          return -1;
        } else if (a === b) {
          continue;
        } else {
          return compareIdentifiers(a, b);
        }
      } while (++i);
    }
    // preminor will bump the version up to the next minor release, and immediately
    // down to pre-release. premajor and prepatch work the same way.
    inc(release, identifier, identifierBase) {
      if (release.startsWith("pre")) {
        if (!identifier && identifierBase === false) {
          throw new Error("invalid increment argument: identifier is empty");
        }
        if (identifier) {
          const match = `-${identifier}`.match(this.options.loose ? re2[t.PRERELEASELOOSE] : re2[t.PRERELEASE]);
          if (!match || match[1] !== identifier) {
            throw new Error(`invalid identifier: ${identifier}`);
          }
        }
      }
      switch (release) {
        case "premajor":
          this.prerelease.length = 0;
          this.patch = 0;
          this.minor = 0;
          this.major++;
          this.inc("pre", identifier, identifierBase);
          break;
        case "preminor":
          this.prerelease.length = 0;
          this.patch = 0;
          this.minor++;
          this.inc("pre", identifier, identifierBase);
          break;
        case "prepatch":
          this.prerelease.length = 0;
          this.inc("patch", identifier, identifierBase);
          this.inc("pre", identifier, identifierBase);
          break;
        // If the input is a non-prerelease version, this acts the same as
        // prepatch.
        case "prerelease":
          if (this.prerelease.length === 0) {
            this.inc("patch", identifier, identifierBase);
          }
          this.inc("pre", identifier, identifierBase);
          break;
        case "release":
          if (this.prerelease.length === 0) {
            throw new Error(`version ${this.raw} is not a prerelease`);
          }
          this.prerelease.length = 0;
          break;
        case "major":
          if (this.minor !== 0 || this.patch !== 0 || this.prerelease.length === 0) {
            this.major++;
          }
          this.minor = 0;
          this.patch = 0;
          this.prerelease = [];
          break;
        case "minor":
          if (this.patch !== 0 || this.prerelease.length === 0) {
            this.minor++;
          }
          this.patch = 0;
          this.prerelease = [];
          break;
        case "patch":
          if (this.prerelease.length === 0) {
            this.patch++;
          }
          this.prerelease = [];
          break;
        // This probably shouldn't be used publicly.
        // 1.0.0 'pre' would become 1.0.0-0 which is the wrong direction.
        case "pre": {
          const base = Number(identifierBase) ? 1 : 0;
          if (this.prerelease.length === 0) {
            this.prerelease = [base];
          } else {
            let i = this.prerelease.length;
            while (--i >= 0) {
              if (typeof this.prerelease[i] === "number") {
                this.prerelease[i]++;
                i = -2;
              }
            }
            if (i === -1) {
              if (identifier === this.prerelease.join(".") && identifierBase === false) {
                throw new Error("invalid increment argument: identifier already exists");
              }
              this.prerelease.push(base);
            }
          }
          if (identifier) {
            let prerelease = [identifier, base];
            if (identifierBase === false) {
              prerelease = [identifier];
            }
            if (compareIdentifiers(this.prerelease[0], identifier) === 0) {
              if (isNaN(this.prerelease[1])) {
                this.prerelease = prerelease;
              }
            } else {
              this.prerelease = prerelease;
            }
          }
          break;
        }
        default:
          throw new Error(`invalid increment argument: ${release}`);
      }
      this.raw = this.format();
      if (this.build.length) {
        this.raw += `+${this.build.join(".")}`;
      }
      return this;
    }
  }
  semver$1 = SemVer;
  return semver$1;
}
var parse_1;
var hasRequiredParse;
function requireParse() {
  if (hasRequiredParse) return parse_1;
  hasRequiredParse = 1;
  const SemVer = requireSemver$1();
  const parse = (version, options, throwErrors = false) => {
    if (version instanceof SemVer) {
      return version;
    }
    try {
      return new SemVer(version, options);
    } catch (er) {
      if (!throwErrors) {
        return null;
      }
      throw er;
    }
  };
  parse_1 = parse;
  return parse_1;
}
var valid_1;
var hasRequiredValid$1;
function requireValid$1() {
  if (hasRequiredValid$1) return valid_1;
  hasRequiredValid$1 = 1;
  const parse = requireParse();
  const valid2 = (version, options) => {
    const v = parse(version, options);
    return v ? v.version : null;
  };
  valid_1 = valid2;
  return valid_1;
}
var clean_1;
var hasRequiredClean;
function requireClean() {
  if (hasRequiredClean) return clean_1;
  hasRequiredClean = 1;
  const parse = requireParse();
  const clean = (version, options) => {
    const s = parse(version.trim().replace(/^[=v]+/, ""), options);
    return s ? s.version : null;
  };
  clean_1 = clean;
  return clean_1;
}
var inc_1;
var hasRequiredInc;
function requireInc() {
  if (hasRequiredInc) return inc_1;
  hasRequiredInc = 1;
  const SemVer = requireSemver$1();
  const inc = (version, release, options, identifier, identifierBase) => {
    if (typeof options === "string") {
      identifierBase = identifier;
      identifier = options;
      options = void 0;
    }
    try {
      return new SemVer(
        version instanceof SemVer ? version.version : version,
        options
      ).inc(release, identifier, identifierBase).version;
    } catch (er) {
      return null;
    }
  };
  inc_1 = inc;
  return inc_1;
}
var diff_1;
var hasRequiredDiff;
function requireDiff() {
  if (hasRequiredDiff) return diff_1;
  hasRequiredDiff = 1;
  const parse = requireParse();
  const diff = (version1, version2) => {
    const v1 = parse(version1, null, true);
    const v2 = parse(version2, null, true);
    const comparison = v1.compare(v2);
    if (comparison === 0) {
      return null;
    }
    const v1Higher = comparison > 0;
    const highVersion = v1Higher ? v1 : v2;
    const lowVersion = v1Higher ? v2 : v1;
    const highHasPre = !!highVersion.prerelease.length;
    const lowHasPre = !!lowVersion.prerelease.length;
    if (lowHasPre && !highHasPre) {
      if (!lowVersion.patch && !lowVersion.minor) {
        return "major";
      }
      if (lowVersion.compareMain(highVersion) === 0) {
        if (lowVersion.minor && !lowVersion.patch) {
          return "minor";
        }
        return "patch";
      }
    }
    const prefix = highHasPre ? "pre" : "";
    if (v1.major !== v2.major) {
      return prefix + "major";
    }
    if (v1.minor !== v2.minor) {
      return prefix + "minor";
    }
    if (v1.patch !== v2.patch) {
      return prefix + "patch";
    }
    return "prerelease";
  };
  diff_1 = diff;
  return diff_1;
}
var major_1;
var hasRequiredMajor;
function requireMajor() {
  if (hasRequiredMajor) return major_1;
  hasRequiredMajor = 1;
  const SemVer = requireSemver$1();
  const major = (a, loose) => new SemVer(a, loose).major;
  major_1 = major;
  return major_1;
}
var minor_1;
var hasRequiredMinor;
function requireMinor() {
  if (hasRequiredMinor) return minor_1;
  hasRequiredMinor = 1;
  const SemVer = requireSemver$1();
  const minor = (a, loose) => new SemVer(a, loose).minor;
  minor_1 = minor;
  return minor_1;
}
var patch_1;
var hasRequiredPatch;
function requirePatch() {
  if (hasRequiredPatch) return patch_1;
  hasRequiredPatch = 1;
  const SemVer = requireSemver$1();
  const patch = (a, loose) => new SemVer(a, loose).patch;
  patch_1 = patch;
  return patch_1;
}
var prerelease_1;
var hasRequiredPrerelease;
function requirePrerelease() {
  if (hasRequiredPrerelease) return prerelease_1;
  hasRequiredPrerelease = 1;
  const parse = requireParse();
  const prerelease = (version, options) => {
    const parsed = parse(version, options);
    return parsed && parsed.prerelease.length ? parsed.prerelease : null;
  };
  prerelease_1 = prerelease;
  return prerelease_1;
}
var compare_1;
var hasRequiredCompare;
function requireCompare() {
  if (hasRequiredCompare) return compare_1;
  hasRequiredCompare = 1;
  const SemVer = requireSemver$1();
  const compare = (a, b, loose) => new SemVer(a, loose).compare(new SemVer(b, loose));
  compare_1 = compare;
  return compare_1;
}
var rcompare_1;
var hasRequiredRcompare;
function requireRcompare() {
  if (hasRequiredRcompare) return rcompare_1;
  hasRequiredRcompare = 1;
  const compare = requireCompare();
  const rcompare = (a, b, loose) => compare(b, a, loose);
  rcompare_1 = rcompare;
  return rcompare_1;
}
var compareLoose_1;
var hasRequiredCompareLoose;
function requireCompareLoose() {
  if (hasRequiredCompareLoose) return compareLoose_1;
  hasRequiredCompareLoose = 1;
  const compare = requireCompare();
  const compareLoose = (a, b) => compare(a, b, true);
  compareLoose_1 = compareLoose;
  return compareLoose_1;
}
var compareBuild_1;
var hasRequiredCompareBuild;
function requireCompareBuild() {
  if (hasRequiredCompareBuild) return compareBuild_1;
  hasRequiredCompareBuild = 1;
  const SemVer = requireSemver$1();
  const compareBuild = (a, b, loose) => {
    const versionA = new SemVer(a, loose);
    const versionB = new SemVer(b, loose);
    return versionA.compare(versionB) || versionA.compareBuild(versionB);
  };
  compareBuild_1 = compareBuild;
  return compareBuild_1;
}
var sort_1;
var hasRequiredSort;
function requireSort() {
  if (hasRequiredSort) return sort_1;
  hasRequiredSort = 1;
  const compareBuild = requireCompareBuild();
  const sort = (list, loose) => list.sort((a, b) => compareBuild(a, b, loose));
  sort_1 = sort;
  return sort_1;
}
var rsort_1;
var hasRequiredRsort;
function requireRsort() {
  if (hasRequiredRsort) return rsort_1;
  hasRequiredRsort = 1;
  const compareBuild = requireCompareBuild();
  const rsort = (list, loose) => list.sort((a, b) => compareBuild(b, a, loose));
  rsort_1 = rsort;
  return rsort_1;
}
var gt_1;
var hasRequiredGt;
function requireGt() {
  if (hasRequiredGt) return gt_1;
  hasRequiredGt = 1;
  const compare = requireCompare();
  const gt = (a, b, loose) => compare(a, b, loose) > 0;
  gt_1 = gt;
  return gt_1;
}
var lt_1;
var hasRequiredLt;
function requireLt() {
  if (hasRequiredLt) return lt_1;
  hasRequiredLt = 1;
  const compare = requireCompare();
  const lt = (a, b, loose) => compare(a, b, loose) < 0;
  lt_1 = lt;
  return lt_1;
}
var eq_1;
var hasRequiredEq;
function requireEq() {
  if (hasRequiredEq) return eq_1;
  hasRequiredEq = 1;
  const compare = requireCompare();
  const eq = (a, b, loose) => compare(a, b, loose) === 0;
  eq_1 = eq;
  return eq_1;
}
var neq_1;
var hasRequiredNeq;
function requireNeq() {
  if (hasRequiredNeq) return neq_1;
  hasRequiredNeq = 1;
  const compare = requireCompare();
  const neq = (a, b, loose) => compare(a, b, loose) !== 0;
  neq_1 = neq;
  return neq_1;
}
var gte_1;
var hasRequiredGte;
function requireGte() {
  if (hasRequiredGte) return gte_1;
  hasRequiredGte = 1;
  const compare = requireCompare();
  const gte = (a, b, loose) => compare(a, b, loose) >= 0;
  gte_1 = gte;
  return gte_1;
}
var lte_1;
var hasRequiredLte;
function requireLte() {
  if (hasRequiredLte) return lte_1;
  hasRequiredLte = 1;
  const compare = requireCompare();
  const lte = (a, b, loose) => compare(a, b, loose) <= 0;
  lte_1 = lte;
  return lte_1;
}
var cmp_1;
var hasRequiredCmp;
function requireCmp() {
  if (hasRequiredCmp) return cmp_1;
  hasRequiredCmp = 1;
  const eq = requireEq();
  const neq = requireNeq();
  const gt = requireGt();
  const gte = requireGte();
  const lt = requireLt();
  const lte = requireLte();
  const cmp = (a, op, b, loose) => {
    switch (op) {
      case "===":
        if (typeof a === "object") {
          a = a.version;
        }
        if (typeof b === "object") {
          b = b.version;
        }
        return a === b;
      case "!==":
        if (typeof a === "object") {
          a = a.version;
        }
        if (typeof b === "object") {
          b = b.version;
        }
        return a !== b;
      case "":
      case "=":
      case "==":
        return eq(a, b, loose);
      case "!=":
        return neq(a, b, loose);
      case ">":
        return gt(a, b, loose);
      case ">=":
        return gte(a, b, loose);
      case "<":
        return lt(a, b, loose);
      case "<=":
        return lte(a, b, loose);
      default:
        throw new TypeError(`Invalid operator: ${op}`);
    }
  };
  cmp_1 = cmp;
  return cmp_1;
}
var coerce_1;
var hasRequiredCoerce;
function requireCoerce() {
  if (hasRequiredCoerce) return coerce_1;
  hasRequiredCoerce = 1;
  const SemVer = requireSemver$1();
  const parse = requireParse();
  const { safeRe: re2, t } = requireRe();
  const coerce = (version, options) => {
    if (version instanceof SemVer) {
      return version;
    }
    if (typeof version === "number") {
      version = String(version);
    }
    if (typeof version !== "string") {
      return null;
    }
    options = options || {};
    let match = null;
    if (!options.rtl) {
      match = version.match(options.includePrerelease ? re2[t.COERCEFULL] : re2[t.COERCE]);
    } else {
      const coerceRtlRegex = options.includePrerelease ? re2[t.COERCERTLFULL] : re2[t.COERCERTL];
      let next;
      while ((next = coerceRtlRegex.exec(version)) && (!match || match.index + match[0].length !== version.length)) {
        if (!match || next.index + next[0].length !== match.index + match[0].length) {
          match = next;
        }
        coerceRtlRegex.lastIndex = next.index + next[1].length + next[2].length;
      }
      coerceRtlRegex.lastIndex = -1;
    }
    if (match === null) {
      return null;
    }
    const major = match[2];
    const minor = match[3] || "0";
    const patch = match[4] || "0";
    const prerelease = options.includePrerelease && match[5] ? `-${match[5]}` : "";
    const build = options.includePrerelease && match[6] ? `+${match[6]}` : "";
    return parse(`${major}.${minor}.${patch}${prerelease}${build}`, options);
  };
  coerce_1 = coerce;
  return coerce_1;
}
var lrucache;
var hasRequiredLrucache;
function requireLrucache() {
  if (hasRequiredLrucache) return lrucache;
  hasRequiredLrucache = 1;
  class LRUCache {
    constructor() {
      this.max = 1e3;
      this.map = /* @__PURE__ */ new Map();
    }
    get(key) {
      const value = this.map.get(key);
      if (value === void 0) {
        return void 0;
      } else {
        this.map.delete(key);
        this.map.set(key, value);
        return value;
      }
    }
    delete(key) {
      return this.map.delete(key);
    }
    set(key, value) {
      const deleted = this.delete(key);
      if (!deleted && value !== void 0) {
        if (this.map.size >= this.max) {
          const firstKey = this.map.keys().next().value;
          this.delete(firstKey);
        }
        this.map.set(key, value);
      }
      return this;
    }
  }
  lrucache = LRUCache;
  return lrucache;
}
var range;
var hasRequiredRange;
function requireRange() {
  if (hasRequiredRange) return range;
  hasRequiredRange = 1;
  const SPACE_CHARACTERS = /\s+/g;
  class Range {
    constructor(range2, options) {
      options = parseOptions(options);
      if (range2 instanceof Range) {
        if (range2.loose === !!options.loose && range2.includePrerelease === !!options.includePrerelease) {
          return range2;
        } else {
          return new Range(range2.raw, options);
        }
      }
      if (range2 instanceof Comparator) {
        this.raw = range2.value;
        this.set = [[range2]];
        this.formatted = void 0;
        return this;
      }
      this.options = options;
      this.loose = !!options.loose;
      this.includePrerelease = !!options.includePrerelease;
      this.raw = range2.trim().replace(SPACE_CHARACTERS, " ");
      this.set = this.raw.split("||").map((r) => this.parseRange(r.trim())).filter((c) => c.length);
      if (!this.set.length) {
        throw new TypeError(`Invalid SemVer Range: ${this.raw}`);
      }
      if (this.set.length > 1) {
        const first = this.set[0];
        this.set = this.set.filter((c) => !isNullSet(c[0]));
        if (this.set.length === 0) {
          this.set = [first];
        } else if (this.set.length > 1) {
          for (const c of this.set) {
            if (c.length === 1 && isAny(c[0])) {
              this.set = [c];
              break;
            }
          }
        }
      }
      this.formatted = void 0;
    }
    get range() {
      if (this.formatted === void 0) {
        this.formatted = "";
        for (let i = 0; i < this.set.length; i++) {
          if (i > 0) {
            this.formatted += "||";
          }
          const comps = this.set[i];
          for (let k = 0; k < comps.length; k++) {
            if (k > 0) {
              this.formatted += " ";
            }
            this.formatted += comps[k].toString().trim();
          }
        }
      }
      return this.formatted;
    }
    format() {
      return this.range;
    }
    toString() {
      return this.range;
    }
    parseRange(range2) {
      const memoOpts = (this.options.includePrerelease && FLAG_INCLUDE_PRERELEASE) | (this.options.loose && FLAG_LOOSE);
      const memoKey = memoOpts + ":" + range2;
      const cached = cache.get(memoKey);
      if (cached) {
        return cached;
      }
      const loose = this.options.loose;
      const hr = loose ? re2[t.HYPHENRANGELOOSE] : re2[t.HYPHENRANGE];
      range2 = range2.replace(hr, hyphenReplace(this.options.includePrerelease));
      debug("hyphen replace", range2);
      range2 = range2.replace(re2[t.COMPARATORTRIM], comparatorTrimReplace);
      debug("comparator trim", range2);
      range2 = range2.replace(re2[t.TILDETRIM], tildeTrimReplace);
      debug("tilde trim", range2);
      range2 = range2.replace(re2[t.CARETTRIM], caretTrimReplace);
      debug("caret trim", range2);
      let rangeList = range2.split(" ").map((comp) => parseComparator(comp, this.options)).join(" ").split(/\s+/).map((comp) => replaceGTE0(comp, this.options));
      if (loose) {
        rangeList = rangeList.filter((comp) => {
          debug("loose invalid filter", comp, this.options);
          return !!comp.match(re2[t.COMPARATORLOOSE]);
        });
      }
      debug("range list", rangeList);
      const rangeMap = /* @__PURE__ */ new Map();
      const comparators = rangeList.map((comp) => new Comparator(comp, this.options));
      for (const comp of comparators) {
        if (isNullSet(comp)) {
          return [comp];
        }
        rangeMap.set(comp.value, comp);
      }
      if (rangeMap.size > 1 && rangeMap.has("")) {
        rangeMap.delete("");
      }
      const result = [...rangeMap.values()];
      cache.set(memoKey, result);
      return result;
    }
    intersects(range2, options) {
      if (!(range2 instanceof Range)) {
        throw new TypeError("a Range is required");
      }
      return this.set.some((thisComparators) => {
        return isSatisfiable(thisComparators, options) && range2.set.some((rangeComparators) => {
          return isSatisfiable(rangeComparators, options) && thisComparators.every((thisComparator) => {
            return rangeComparators.every((rangeComparator) => {
              return thisComparator.intersects(rangeComparator, options);
            });
          });
        });
      });
    }
    // if ANY of the sets match ALL of its comparators, then pass
    test(version) {
      if (!version) {
        return false;
      }
      if (typeof version === "string") {
        try {
          version = new SemVer(version, this.options);
        } catch (er) {
          return false;
        }
      }
      for (let i = 0; i < this.set.length; i++) {
        if (testSet(this.set[i], version, this.options)) {
          return true;
        }
      }
      return false;
    }
  }
  range = Range;
  const LRU = requireLrucache();
  const cache = new LRU();
  const parseOptions = requireParseOptions();
  const Comparator = requireComparator();
  const debug = requireDebug();
  const SemVer = requireSemver$1();
  const {
    safeRe: re2,
    t,
    comparatorTrimReplace,
    tildeTrimReplace,
    caretTrimReplace
  } = requireRe();
  const { FLAG_INCLUDE_PRERELEASE, FLAG_LOOSE } = requireConstants();
  const isNullSet = (c) => c.value === "<0.0.0-0";
  const isAny = (c) => c.value === "";
  const isSatisfiable = (comparators, options) => {
    let result = true;
    const remainingComparators = comparators.slice();
    let testComparator = remainingComparators.pop();
    while (result && remainingComparators.length) {
      result = remainingComparators.every((otherComparator) => {
        return testComparator.intersects(otherComparator, options);
      });
      testComparator = remainingComparators.pop();
    }
    return result;
  };
  const parseComparator = (comp, options) => {
    debug("comp", comp, options);
    comp = replaceCarets(comp, options);
    debug("caret", comp);
    comp = replaceTildes(comp, options);
    debug("tildes", comp);
    comp = replaceXRanges(comp, options);
    debug("xrange", comp);
    comp = replaceStars(comp, options);
    debug("stars", comp);
    return comp;
  };
  const isX = (id) => !id || id.toLowerCase() === "x" || id === "*";
  const replaceTildes = (comp, options) => {
    return comp.trim().split(/\s+/).map((c) => replaceTilde(c, options)).join(" ");
  };
  const replaceTilde = (comp, options) => {
    const r = options.loose ? re2[t.TILDELOOSE] : re2[t.TILDE];
    return comp.replace(r, (_, M, m, p, pr) => {
      debug("tilde", comp, _, M, m, p, pr);
      let ret;
      if (isX(M)) {
        ret = "";
      } else if (isX(m)) {
        ret = `>=${M}.0.0 <${+M + 1}.0.0-0`;
      } else if (isX(p)) {
        ret = `>=${M}.${m}.0 <${M}.${+m + 1}.0-0`;
      } else if (pr) {
        debug("replaceTilde pr", pr);
        ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`;
      } else {
        ret = `>=${M}.${m}.${p} <${M}.${+m + 1}.0-0`;
      }
      debug("tilde return", ret);
      return ret;
    });
  };
  const replaceCarets = (comp, options) => {
    return comp.trim().split(/\s+/).map((c) => replaceCaret(c, options)).join(" ");
  };
  const replaceCaret = (comp, options) => {
    debug("caret", comp, options);
    const r = options.loose ? re2[t.CARETLOOSE] : re2[t.CARET];
    const z = options.includePrerelease ? "-0" : "";
    return comp.replace(r, (_, M, m, p, pr) => {
      debug("caret", comp, _, M, m, p, pr);
      let ret;
      if (isX(M)) {
        ret = "";
      } else if (isX(m)) {
        ret = `>=${M}.0.0${z} <${+M + 1}.0.0-0`;
      } else if (isX(p)) {
        if (M === "0") {
          ret = `>=${M}.${m}.0${z} <${M}.${+m + 1}.0-0`;
        } else {
          ret = `>=${M}.${m}.0${z} <${+M + 1}.0.0-0`;
        }
      } else if (pr) {
        debug("replaceCaret pr", pr);
        if (M === "0") {
          if (m === "0") {
            ret = `>=${M}.${m}.${p}-${pr} <${M}.${m}.${+p + 1}-0`;
          } else {
            ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`;
          }
        } else {
          ret = `>=${M}.${m}.${p}-${pr} <${+M + 1}.0.0-0`;
        }
      } else {
        debug("no pr");
        if (M === "0") {
          if (m === "0") {
            ret = `>=${M}.${m}.${p}${z} <${M}.${m}.${+p + 1}-0`;
          } else {
            ret = `>=${M}.${m}.${p}${z} <${M}.${+m + 1}.0-0`;
          }
        } else {
          ret = `>=${M}.${m}.${p} <${+M + 1}.0.0-0`;
        }
      }
      debug("caret return", ret);
      return ret;
    });
  };
  const replaceXRanges = (comp, options) => {
    debug("replaceXRanges", comp, options);
    return comp.split(/\s+/).map((c) => replaceXRange(c, options)).join(" ");
  };
  const replaceXRange = (comp, options) => {
    comp = comp.trim();
    const r = options.loose ? re2[t.XRANGELOOSE] : re2[t.XRANGE];
    return comp.replace(r, (ret, gtlt, M, m, p, pr) => {
      debug("xRange", comp, ret, gtlt, M, m, p, pr);
      const xM = isX(M);
      const xm = xM || isX(m);
      const xp = xm || isX(p);
      const anyX = xp;
      if (gtlt === "=" && anyX) {
        gtlt = "";
      }
      pr = options.includePrerelease ? "-0" : "";
      if (xM) {
        if (gtlt === ">" || gtlt === "<") {
          ret = "<0.0.0-0";
        } else {
          ret = "*";
        }
      } else if (gtlt && anyX) {
        if (xm) {
          m = 0;
        }
        p = 0;
        if (gtlt === ">") {
          gtlt = ">=";
          if (xm) {
            M = +M + 1;
            m = 0;
            p = 0;
          } else {
            m = +m + 1;
            p = 0;
          }
        } else if (gtlt === "<=") {
          gtlt = "<";
          if (xm) {
            M = +M + 1;
          } else {
            m = +m + 1;
          }
        }
        if (gtlt === "<") {
          pr = "-0";
        }
        ret = `${gtlt + M}.${m}.${p}${pr}`;
      } else if (xm) {
        ret = `>=${M}.0.0${pr} <${+M + 1}.0.0-0`;
      } else if (xp) {
        ret = `>=${M}.${m}.0${pr} <${M}.${+m + 1}.0-0`;
      }
      debug("xRange return", ret);
      return ret;
    });
  };
  const replaceStars = (comp, options) => {
    debug("replaceStars", comp, options);
    return comp.trim().replace(re2[t.STAR], "");
  };
  const replaceGTE0 = (comp, options) => {
    debug("replaceGTE0", comp, options);
    return comp.trim().replace(re2[options.includePrerelease ? t.GTE0PRE : t.GTE0], "");
  };
  const hyphenReplace = (incPr) => ($0, from, fM, fm, fp, fpr, fb, to, tM, tm, tp, tpr) => {
    if (isX(fM)) {
      from = "";
    } else if (isX(fm)) {
      from = `>=${fM}.0.0${incPr ? "-0" : ""}`;
    } else if (isX(fp)) {
      from = `>=${fM}.${fm}.0${incPr ? "-0" : ""}`;
    } else if (fpr) {
      from = `>=${from}`;
    } else {
      from = `>=${from}${incPr ? "-0" : ""}`;
    }
    if (isX(tM)) {
      to = "";
    } else if (isX(tm)) {
      to = `<${+tM + 1}.0.0-0`;
    } else if (isX(tp)) {
      to = `<${tM}.${+tm + 1}.0-0`;
    } else if (tpr) {
      to = `<=${tM}.${tm}.${tp}-${tpr}`;
    } else if (incPr) {
      to = `<${tM}.${tm}.${+tp + 1}-0`;
    } else {
      to = `<=${to}`;
    }
    return `${from} ${to}`.trim();
  };
  const testSet = (set2, version, options) => {
    for (let i = 0; i < set2.length; i++) {
      if (!set2[i].test(version)) {
        return false;
      }
    }
    if (version.prerelease.length && !options.includePrerelease) {
      for (let i = 0; i < set2.length; i++) {
        debug(set2[i].semver);
        if (set2[i].semver === Comparator.ANY) {
          continue;
        }
        if (set2[i].semver.prerelease.length > 0) {
          const allowed = set2[i].semver;
          if (allowed.major === version.major && allowed.minor === version.minor && allowed.patch === version.patch) {
            return true;
          }
        }
      }
      return false;
    }
    return true;
  };
  return range;
}
var comparator;
var hasRequiredComparator;
function requireComparator() {
  if (hasRequiredComparator) return comparator;
  hasRequiredComparator = 1;
  const ANY = Symbol("SemVer ANY");
  class Comparator {
    static get ANY() {
      return ANY;
    }
    constructor(comp, options) {
      options = parseOptions(options);
      if (comp instanceof Comparator) {
        if (comp.loose === !!options.loose) {
          return comp;
        } else {
          comp = comp.value;
        }
      }
      comp = comp.trim().split(/\s+/).join(" ");
      debug("comparator", comp, options);
      this.options = options;
      this.loose = !!options.loose;
      this.parse(comp);
      if (this.semver === ANY) {
        this.value = "";
      } else {
        this.value = this.operator + this.semver.version;
      }
      debug("comp", this);
    }
    parse(comp) {
      const r = this.options.loose ? re2[t.COMPARATORLOOSE] : re2[t.COMPARATOR];
      const m = comp.match(r);
      if (!m) {
        throw new TypeError(`Invalid comparator: ${comp}`);
      }
      this.operator = m[1] !== void 0 ? m[1] : "";
      if (this.operator === "=") {
        this.operator = "";
      }
      if (!m[2]) {
        this.semver = ANY;
      } else {
        this.semver = new SemVer(m[2], this.options.loose);
      }
    }
    toString() {
      return this.value;
    }
    test(version) {
      debug("Comparator.test", version, this.options.loose);
      if (this.semver === ANY || version === ANY) {
        return true;
      }
      if (typeof version === "string") {
        try {
          version = new SemVer(version, this.options);
        } catch (er) {
          return false;
        }
      }
      return cmp(version, this.operator, this.semver, this.options);
    }
    intersects(comp, options) {
      if (!(comp instanceof Comparator)) {
        throw new TypeError("a Comparator is required");
      }
      if (this.operator === "") {
        if (this.value === "") {
          return true;
        }
        return new Range(comp.value, options).test(this.value);
      } else if (comp.operator === "") {
        if (comp.value === "") {
          return true;
        }
        return new Range(this.value, options).test(comp.semver);
      }
      options = parseOptions(options);
      if (options.includePrerelease && (this.value === "<0.0.0-0" || comp.value === "<0.0.0-0")) {
        return false;
      }
      if (!options.includePrerelease && (this.value.startsWith("<0.0.0") || comp.value.startsWith("<0.0.0"))) {
        return false;
      }
      if (this.operator.startsWith(">") && comp.operator.startsWith(">")) {
        return true;
      }
      if (this.operator.startsWith("<") && comp.operator.startsWith("<")) {
        return true;
      }
      if (this.semver.version === comp.semver.version && this.operator.includes("=") && comp.operator.includes("=")) {
        return true;
      }
      if (cmp(this.semver, "<", comp.semver, options) && this.operator.startsWith(">") && comp.operator.startsWith("<")) {
        return true;
      }
      if (cmp(this.semver, ">", comp.semver, options) && this.operator.startsWith("<") && comp.operator.startsWith(">")) {
        return true;
      }
      return false;
    }
  }
  comparator = Comparator;
  const parseOptions = requireParseOptions();
  const { safeRe: re2, t } = requireRe();
  const cmp = requireCmp();
  const debug = requireDebug();
  const SemVer = requireSemver$1();
  const Range = requireRange();
  return comparator;
}
var satisfies_1;
var hasRequiredSatisfies;
function requireSatisfies() {
  if (hasRequiredSatisfies) return satisfies_1;
  hasRequiredSatisfies = 1;
  const Range = requireRange();
  const satisfies = (version, range2, options) => {
    try {
      range2 = new Range(range2, options);
    } catch (er) {
      return false;
    }
    return range2.test(version);
  };
  satisfies_1 = satisfies;
  return satisfies_1;
}
var toComparators_1;
var hasRequiredToComparators;
function requireToComparators() {
  if (hasRequiredToComparators) return toComparators_1;
  hasRequiredToComparators = 1;
  const Range = requireRange();
  const toComparators = (range2, options) => new Range(range2, options).set.map((comp) => comp.map((c) => c.value).join(" ").trim().split(" "));
  toComparators_1 = toComparators;
  return toComparators_1;
}
var maxSatisfying_1;
var hasRequiredMaxSatisfying;
function requireMaxSatisfying() {
  if (hasRequiredMaxSatisfying) return maxSatisfying_1;
  hasRequiredMaxSatisfying = 1;
  const SemVer = requireSemver$1();
  const Range = requireRange();
  const maxSatisfying = (versions, range2, options) => {
    let max = null;
    let maxSV = null;
    let rangeObj = null;
    try {
      rangeObj = new Range(range2, options);
    } catch (er) {
      return null;
    }
    versions.forEach((v) => {
      if (rangeObj.test(v)) {
        if (!max || maxSV.compare(v) === -1) {
          max = v;
          maxSV = new SemVer(max, options);
        }
      }
    });
    return max;
  };
  maxSatisfying_1 = maxSatisfying;
  return maxSatisfying_1;
}
var minSatisfying_1;
var hasRequiredMinSatisfying;
function requireMinSatisfying() {
  if (hasRequiredMinSatisfying) return minSatisfying_1;
  hasRequiredMinSatisfying = 1;
  const SemVer = requireSemver$1();
  const Range = requireRange();
  const minSatisfying = (versions, range2, options) => {
    let min = null;
    let minSV = null;
    let rangeObj = null;
    try {
      rangeObj = new Range(range2, options);
    } catch (er) {
      return null;
    }
    versions.forEach((v) => {
      if (rangeObj.test(v)) {
        if (!min || minSV.compare(v) === 1) {
          min = v;
          minSV = new SemVer(min, options);
        }
      }
    });
    return min;
  };
  minSatisfying_1 = minSatisfying;
  return minSatisfying_1;
}
var minVersion_1;
var hasRequiredMinVersion;
function requireMinVersion() {
  if (hasRequiredMinVersion) return minVersion_1;
  hasRequiredMinVersion = 1;
  const SemVer = requireSemver$1();
  const Range = requireRange();
  const gt = requireGt();
  const minVersion = (range2, loose) => {
    range2 = new Range(range2, loose);
    let minver = new SemVer("0.0.0");
    if (range2.test(minver)) {
      return minver;
    }
    minver = new SemVer("0.0.0-0");
    if (range2.test(minver)) {
      return minver;
    }
    minver = null;
    for (let i = 0; i < range2.set.length; ++i) {
      const comparators = range2.set[i];
      let setMin = null;
      comparators.forEach((comparator2) => {
        const compver = new SemVer(comparator2.semver.version);
        switch (comparator2.operator) {
          case ">":
            if (compver.prerelease.length === 0) {
              compver.patch++;
            } else {
              compver.prerelease.push(0);
            }
            compver.raw = compver.format();
          /* fallthrough */
          case "":
          case ">=":
            if (!setMin || gt(compver, setMin)) {
              setMin = compver;
            }
            break;
          case "<":
          case "<=":
            break;
          /* istanbul ignore next */
          default:
            throw new Error(`Unexpected operation: ${comparator2.operator}`);
        }
      });
      if (setMin && (!minver || gt(minver, setMin))) {
        minver = setMin;
      }
    }
    if (minver && range2.test(minver)) {
      return minver;
    }
    return null;
  };
  minVersion_1 = minVersion;
  return minVersion_1;
}
var valid;
var hasRequiredValid;
function requireValid() {
  if (hasRequiredValid) return valid;
  hasRequiredValid = 1;
  const Range = requireRange();
  const validRange = (range2, options) => {
    try {
      return new Range(range2, options).range || "*";
    } catch (er) {
      return null;
    }
  };
  valid = validRange;
  return valid;
}
var outside_1;
var hasRequiredOutside;
function requireOutside() {
  if (hasRequiredOutside) return outside_1;
  hasRequiredOutside = 1;
  const SemVer = requireSemver$1();
  const Comparator = requireComparator();
  const { ANY } = Comparator;
  const Range = requireRange();
  const satisfies = requireSatisfies();
  const gt = requireGt();
  const lt = requireLt();
  const lte = requireLte();
  const gte = requireGte();
  const outside = (version, range2, hilo, options) => {
    version = new SemVer(version, options);
    range2 = new Range(range2, options);
    let gtfn, ltefn, ltfn, comp, ecomp;
    switch (hilo) {
      case ">":
        gtfn = gt;
        ltefn = lte;
        ltfn = lt;
        comp = ">";
        ecomp = ">=";
        break;
      case "<":
        gtfn = lt;
        ltefn = gte;
        ltfn = gt;
        comp = "<";
        ecomp = "<=";
        break;
      default:
        throw new TypeError('Must provide a hilo val of "<" or ">"');
    }
    if (satisfies(version, range2, options)) {
      return false;
    }
    for (let i = 0; i < range2.set.length; ++i) {
      const comparators = range2.set[i];
      let high = null;
      let low = null;
      comparators.forEach((comparator2) => {
        if (comparator2.semver === ANY) {
          comparator2 = new Comparator(">=0.0.0");
        }
        high = high || comparator2;
        low = low || comparator2;
        if (gtfn(comparator2.semver, high.semver, options)) {
          high = comparator2;
        } else if (ltfn(comparator2.semver, low.semver, options)) {
          low = comparator2;
        }
      });
      if (high.operator === comp || high.operator === ecomp) {
        return false;
      }
      if ((!low.operator || low.operator === comp) && ltefn(version, low.semver)) {
        return false;
      } else if (low.operator === ecomp && ltfn(version, low.semver)) {
        return false;
      }
    }
    return true;
  };
  outside_1 = outside;
  return outside_1;
}
var gtr_1;
var hasRequiredGtr;
function requireGtr() {
  if (hasRequiredGtr) return gtr_1;
  hasRequiredGtr = 1;
  const outside = requireOutside();
  const gtr = (version, range2, options) => outside(version, range2, ">", options);
  gtr_1 = gtr;
  return gtr_1;
}
var ltr_1;
var hasRequiredLtr;
function requireLtr() {
  if (hasRequiredLtr) return ltr_1;
  hasRequiredLtr = 1;
  const outside = requireOutside();
  const ltr = (version, range2, options) => outside(version, range2, "<", options);
  ltr_1 = ltr;
  return ltr_1;
}
var intersects_1;
var hasRequiredIntersects;
function requireIntersects() {
  if (hasRequiredIntersects) return intersects_1;
  hasRequiredIntersects = 1;
  const Range = requireRange();
  const intersects = (r1, r2, options) => {
    r1 = new Range(r1, options);
    r2 = new Range(r2, options);
    return r1.intersects(r2, options);
  };
  intersects_1 = intersects;
  return intersects_1;
}
var simplify;
var hasRequiredSimplify;
function requireSimplify() {
  if (hasRequiredSimplify) return simplify;
  hasRequiredSimplify = 1;
  const satisfies = requireSatisfies();
  const compare = requireCompare();
  simplify = (versions, range2, options) => {
    const set2 = [];
    let first = null;
    let prev = null;
    const v = versions.sort((a, b) => compare(a, b, options));
    for (const version of v) {
      const included = satisfies(version, range2, options);
      if (included) {
        prev = version;
        if (!first) {
          first = version;
        }
      } else {
        if (prev) {
          set2.push([first, prev]);
        }
        prev = null;
        first = null;
      }
    }
    if (first) {
      set2.push([first, null]);
    }
    const ranges = [];
    for (const [min, max] of set2) {
      if (min === max) {
        ranges.push(min);
      } else if (!max && min === v[0]) {
        ranges.push("*");
      } else if (!max) {
        ranges.push(`>=${min}`);
      } else if (min === v[0]) {
        ranges.push(`<=${max}`);
      } else {
        ranges.push(`${min} - ${max}`);
      }
    }
    const simplified = ranges.join(" || ");
    const original = typeof range2.raw === "string" ? range2.raw : String(range2);
    return simplified.length < original.length ? simplified : range2;
  };
  return simplify;
}
var subset_1;
var hasRequiredSubset;
function requireSubset() {
  if (hasRequiredSubset) return subset_1;
  hasRequiredSubset = 1;
  const Range = requireRange();
  const Comparator = requireComparator();
  const { ANY } = Comparator;
  const satisfies = requireSatisfies();
  const compare = requireCompare();
  const subset = (sub, dom, options = {}) => {
    if (sub === dom) {
      return true;
    }
    sub = new Range(sub, options);
    dom = new Range(dom, options);
    let sawNonNull = false;
    OUTER: for (const simpleSub of sub.set) {
      for (const simpleDom of dom.set) {
        const isSub = simpleSubset(simpleSub, simpleDom, options);
        sawNonNull = sawNonNull || isSub !== null;
        if (isSub) {
          continue OUTER;
        }
      }
      if (sawNonNull) {
        return false;
      }
    }
    return true;
  };
  const minimumVersionWithPreRelease = [new Comparator(">=0.0.0-0")];
  const minimumVersion = [new Comparator(">=0.0.0")];
  const simpleSubset = (sub, dom, options) => {
    if (sub === dom) {
      return true;
    }
    if (sub.length === 1 && sub[0].semver === ANY) {
      if (dom.length === 1 && dom[0].semver === ANY) {
        return true;
      } else if (options.includePrerelease) {
        sub = minimumVersionWithPreRelease;
      } else {
        sub = minimumVersion;
      }
    }
    if (dom.length === 1 && dom[0].semver === ANY) {
      if (options.includePrerelease) {
        return true;
      } else {
        dom = minimumVersion;
      }
    }
    const eqSet = /* @__PURE__ */ new Set();
    let gt, lt;
    for (const c of sub) {
      if (c.operator === ">" || c.operator === ">=") {
        gt = higherGT(gt, c, options);
      } else if (c.operator === "<" || c.operator === "<=") {
        lt = lowerLT(lt, c, options);
      } else {
        eqSet.add(c.semver);
      }
    }
    if (eqSet.size > 1) {
      return null;
    }
    let gtltComp;
    if (gt && lt) {
      gtltComp = compare(gt.semver, lt.semver, options);
      if (gtltComp > 0) {
        return null;
      } else if (gtltComp === 0 && (gt.operator !== ">=" || lt.operator !== "<=")) {
        return null;
      }
    }
    for (const eq of eqSet) {
      if (gt && !satisfies(eq, String(gt), options)) {
        return null;
      }
      if (lt && !satisfies(eq, String(lt), options)) {
        return null;
      }
      for (const c of dom) {
        if (!satisfies(eq, String(c), options)) {
          return false;
        }
      }
      return true;
    }
    let higher, lower;
    let hasDomLT, hasDomGT;
    let needDomLTPre = lt && !options.includePrerelease && lt.semver.prerelease.length ? lt.semver : false;
    let needDomGTPre = gt && !options.includePrerelease && gt.semver.prerelease.length ? gt.semver : false;
    if (needDomLTPre && needDomLTPre.prerelease.length === 1 && lt.operator === "<" && needDomLTPre.prerelease[0] === 0) {
      needDomLTPre = false;
    }
    for (const c of dom) {
      hasDomGT = hasDomGT || c.operator === ">" || c.operator === ">=";
      hasDomLT = hasDomLT || c.operator === "<" || c.operator === "<=";
      if (gt) {
        if (needDomGTPre) {
          if (c.semver.prerelease && c.semver.prerelease.length && c.semver.major === needDomGTPre.major && c.semver.minor === needDomGTPre.minor && c.semver.patch === needDomGTPre.patch) {
            needDomGTPre = false;
          }
        }
        if (c.operator === ">" || c.operator === ">=") {
          higher = higherGT(gt, c, options);
          if (higher === c && higher !== gt) {
            return false;
          }
        } else if (gt.operator === ">=" && !satisfies(gt.semver, String(c), options)) {
          return false;
        }
      }
      if (lt) {
        if (needDomLTPre) {
          if (c.semver.prerelease && c.semver.prerelease.length && c.semver.major === needDomLTPre.major && c.semver.minor === needDomLTPre.minor && c.semver.patch === needDomLTPre.patch) {
            needDomLTPre = false;
          }
        }
        if (c.operator === "<" || c.operator === "<=") {
          lower = lowerLT(lt, c, options);
          if (lower === c && lower !== lt) {
            return false;
          }
        } else if (lt.operator === "<=" && !satisfies(lt.semver, String(c), options)) {
          return false;
        }
      }
      if (!c.operator && (lt || gt) && gtltComp !== 0) {
        return false;
      }
    }
    if (gt && hasDomLT && !lt && gtltComp !== 0) {
      return false;
    }
    if (lt && hasDomGT && !gt && gtltComp !== 0) {
      return false;
    }
    if (needDomGTPre || needDomLTPre) {
      return false;
    }
    return true;
  };
  const higherGT = (a, b, options) => {
    if (!a) {
      return b;
    }
    const comp = compare(a.semver, b.semver, options);
    return comp > 0 ? a : comp < 0 ? b : b.operator === ">" && a.operator === ">=" ? b : a;
  };
  const lowerLT = (a, b, options) => {
    if (!a) {
      return b;
    }
    const comp = compare(a.semver, b.semver, options);
    return comp < 0 ? a : comp > 0 ? b : b.operator === "<" && a.operator === "<=" ? b : a;
  };
  subset_1 = subset;
  return subset_1;
}
var semver;
var hasRequiredSemver;
function requireSemver() {
  if (hasRequiredSemver) return semver;
  hasRequiredSemver = 1;
  const internalRe = requireRe();
  const constants2 = requireConstants();
  const SemVer = requireSemver$1();
  const identifiers2 = requireIdentifiers();
  const parse = requireParse();
  const valid2 = requireValid$1();
  const clean = requireClean();
  const inc = requireInc();
  const diff = requireDiff();
  const major = requireMajor();
  const minor = requireMinor();
  const patch = requirePatch();
  const prerelease = requirePrerelease();
  const compare = requireCompare();
  const rcompare = requireRcompare();
  const compareLoose = requireCompareLoose();
  const compareBuild = requireCompareBuild();
  const sort = requireSort();
  const rsort = requireRsort();
  const gt = requireGt();
  const lt = requireLt();
  const eq = requireEq();
  const neq = requireNeq();
  const gte = requireGte();
  const lte = requireLte();
  const cmp = requireCmp();
  const coerce = requireCoerce();
  const Comparator = requireComparator();
  const Range = requireRange();
  const satisfies = requireSatisfies();
  const toComparators = requireToComparators();
  const maxSatisfying = requireMaxSatisfying();
  const minSatisfying = requireMinSatisfying();
  const minVersion = requireMinVersion();
  const validRange = requireValid();
  const outside = requireOutside();
  const gtr = requireGtr();
  const ltr = requireLtr();
  const intersects = requireIntersects();
  const simplifyRange = requireSimplify();
  const subset = requireSubset();
  semver = {
    parse,
    valid: valid2,
    clean,
    inc,
    diff,
    major,
    minor,
    patch,
    prerelease,
    compare,
    rcompare,
    compareLoose,
    compareBuild,
    sort,
    rsort,
    gt,
    lt,
    eq,
    neq,
    gte,
    lte,
    cmp,
    coerce,
    Comparator,
    Range,
    satisfies,
    toComparators,
    maxSatisfying,
    minSatisfying,
    minVersion,
    validRange,
    outside,
    gtr,
    ltr,
    intersects,
    simplifyRange,
    subset,
    SemVer,
    re: internalRe.re,
    src: internalRe.src,
    tokens: internalRe.t,
    SEMVER_SPEC_VERSION: constants2.SEMVER_SPEC_VERSION,
    RELEASE_TYPES: constants2.RELEASE_TYPES,
    compareIdentifiers: identifiers2.compareIdentifiers,
    rcompareIdentifiers: identifiers2.rcompareIdentifiers
  };
  return semver;
}
var DownloadedUpdateHelper = {};
var lodash_isequal = { exports: {} };
lodash_isequal.exports;
var hasRequiredLodash_isequal;
function requireLodash_isequal() {
  if (hasRequiredLodash_isequal) return lodash_isequal.exports;
  hasRequiredLodash_isequal = 1;
  (function(module, exports) {
    var LARGE_ARRAY_SIZE = 200;
    var HASH_UNDEFINED = "__lodash_hash_undefined__";
    var COMPARE_PARTIAL_FLAG = 1, COMPARE_UNORDERED_FLAG = 2;
    var MAX_SAFE_INTEGER = 9007199254740991;
    var argsTag = "[object Arguments]", arrayTag = "[object Array]", asyncTag = "[object AsyncFunction]", boolTag = "[object Boolean]", dateTag = "[object Date]", errorTag = "[object Error]", funcTag = "[object Function]", genTag = "[object GeneratorFunction]", mapTag = "[object Map]", numberTag = "[object Number]", nullTag = "[object Null]", objectTag = "[object Object]", promiseTag = "[object Promise]", proxyTag = "[object Proxy]", regexpTag = "[object RegExp]", setTag = "[object Set]", stringTag = "[object String]", symbolTag = "[object Symbol]", undefinedTag = "[object Undefined]", weakMapTag = "[object WeakMap]";
    var arrayBufferTag = "[object ArrayBuffer]", dataViewTag = "[object DataView]", float32Tag = "[object Float32Array]", float64Tag = "[object Float64Array]", int8Tag = "[object Int8Array]", int16Tag = "[object Int16Array]", int32Tag = "[object Int32Array]", uint8Tag = "[object Uint8Array]", uint8ClampedTag = "[object Uint8ClampedArray]", uint16Tag = "[object Uint16Array]", uint32Tag = "[object Uint32Array]";
    var reRegExpChar = /[\\^$.*+?()[\]{}|]/g;
    var reIsHostCtor = /^\[object .+?Constructor\]$/;
    var reIsUint = /^(?:0|[1-9]\d*)$/;
    var typedArrayTags = {};
    typedArrayTags[float32Tag] = typedArrayTags[float64Tag] = typedArrayTags[int8Tag] = typedArrayTags[int16Tag] = typedArrayTags[int32Tag] = typedArrayTags[uint8Tag] = typedArrayTags[uint8ClampedTag] = typedArrayTags[uint16Tag] = typedArrayTags[uint32Tag] = true;
    typedArrayTags[argsTag] = typedArrayTags[arrayTag] = typedArrayTags[arrayBufferTag] = typedArrayTags[boolTag] = typedArrayTags[dataViewTag] = typedArrayTags[dateTag] = typedArrayTags[errorTag] = typedArrayTags[funcTag] = typedArrayTags[mapTag] = typedArrayTags[numberTag] = typedArrayTags[objectTag] = typedArrayTags[regexpTag] = typedArrayTags[setTag] = typedArrayTags[stringTag] = typedArrayTags[weakMapTag] = false;
    var freeGlobal = typeof commonjsGlobal == "object" && commonjsGlobal && commonjsGlobal.Object === Object && commonjsGlobal;
    var freeSelf = typeof self == "object" && self && self.Object === Object && self;
    var root = freeGlobal || freeSelf || Function("return this")();
    var freeExports = exports && !exports.nodeType && exports;
    var freeModule = freeExports && true && module && !module.nodeType && module;
    var moduleExports = freeModule && freeModule.exports === freeExports;
    var freeProcess = moduleExports && freeGlobal.process;
    var nodeUtil = (function() {
      try {
        return freeProcess && freeProcess.binding && freeProcess.binding("util");
      } catch (e) {
      }
    })();
    var nodeIsTypedArray = nodeUtil && nodeUtil.isTypedArray;
    function arrayFilter(array, predicate) {
      var index = -1, length = array == null ? 0 : array.length, resIndex = 0, result = [];
      while (++index < length) {
        var value = array[index];
        if (predicate(value, index, array)) {
          result[resIndex++] = value;
        }
      }
      return result;
    }
    function arrayPush(array, values) {
      var index = -1, length = values.length, offset = array.length;
      while (++index < length) {
        array[offset + index] = values[index];
      }
      return array;
    }
    function arraySome(array, predicate) {
      var index = -1, length = array == null ? 0 : array.length;
      while (++index < length) {
        if (predicate(array[index], index, array)) {
          return true;
        }
      }
      return false;
    }
    function baseTimes(n, iteratee) {
      var index = -1, result = Array(n);
      while (++index < n) {
        result[index] = iteratee(index);
      }
      return result;
    }
    function baseUnary(func) {
      return function(value) {
        return func(value);
      };
    }
    function cacheHas(cache, key) {
      return cache.has(key);
    }
    function getValue(object, key) {
      return object == null ? void 0 : object[key];
    }
    function mapToArray(map2) {
      var index = -1, result = Array(map2.size);
      map2.forEach(function(value, key) {
        result[++index] = [key, value];
      });
      return result;
    }
    function overArg(func, transform) {
      return function(arg) {
        return func(transform(arg));
      };
    }
    function setToArray(set2) {
      var index = -1, result = Array(set2.size);
      set2.forEach(function(value) {
        result[++index] = value;
      });
      return result;
    }
    var arrayProto = Array.prototype, funcProto = Function.prototype, objectProto = Object.prototype;
    var coreJsData = root["__core-js_shared__"];
    var funcToString = funcProto.toString;
    var hasOwnProperty = objectProto.hasOwnProperty;
    var maskSrcKey = (function() {
      var uid = /[^.]+$/.exec(coreJsData && coreJsData.keys && coreJsData.keys.IE_PROTO || "");
      return uid ? "Symbol(src)_1." + uid : "";
    })();
    var nativeObjectToString = objectProto.toString;
    var reIsNative = RegExp(
      "^" + funcToString.call(hasOwnProperty).replace(reRegExpChar, "\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, "$1.*?") + "$"
    );
    var Buffer2 = moduleExports ? root.Buffer : void 0, Symbol2 = root.Symbol, Uint8Array2 = root.Uint8Array, propertyIsEnumerable = objectProto.propertyIsEnumerable, splice = arrayProto.splice, symToStringTag = Symbol2 ? Symbol2.toStringTag : void 0;
    var nativeGetSymbols = Object.getOwnPropertySymbols, nativeIsBuffer = Buffer2 ? Buffer2.isBuffer : void 0, nativeKeys = overArg(Object.keys, Object);
    var DataView = getNative(root, "DataView"), Map2 = getNative(root, "Map"), Promise2 = getNative(root, "Promise"), Set2 = getNative(root, "Set"), WeakMap = getNative(root, "WeakMap"), nativeCreate = getNative(Object, "create");
    var dataViewCtorString = toSource(DataView), mapCtorString = toSource(Map2), promiseCtorString = toSource(Promise2), setCtorString = toSource(Set2), weakMapCtorString = toSource(WeakMap);
    var symbolProto = Symbol2 ? Symbol2.prototype : void 0, symbolValueOf = symbolProto ? symbolProto.valueOf : void 0;
    function Hash(entries) {
      var index = -1, length = entries == null ? 0 : entries.length;
      this.clear();
      while (++index < length) {
        var entry = entries[index];
        this.set(entry[0], entry[1]);
      }
    }
    function hashClear() {
      this.__data__ = nativeCreate ? nativeCreate(null) : {};
      this.size = 0;
    }
    function hashDelete(key) {
      var result = this.has(key) && delete this.__data__[key];
      this.size -= result ? 1 : 0;
      return result;
    }
    function hashGet(key) {
      var data = this.__data__;
      if (nativeCreate) {
        var result = data[key];
        return result === HASH_UNDEFINED ? void 0 : result;
      }
      return hasOwnProperty.call(data, key) ? data[key] : void 0;
    }
    function hashHas(key) {
      var data = this.__data__;
      return nativeCreate ? data[key] !== void 0 : hasOwnProperty.call(data, key);
    }
    function hashSet(key, value) {
      var data = this.__data__;
      this.size += this.has(key) ? 0 : 1;
      data[key] = nativeCreate && value === void 0 ? HASH_UNDEFINED : value;
      return this;
    }
    Hash.prototype.clear = hashClear;
    Hash.prototype["delete"] = hashDelete;
    Hash.prototype.get = hashGet;
    Hash.prototype.has = hashHas;
    Hash.prototype.set = hashSet;
    function ListCache(entries) {
      var index = -1, length = entries == null ? 0 : entries.length;
      this.clear();
      while (++index < length) {
        var entry = entries[index];
        this.set(entry[0], entry[1]);
      }
    }
    function listCacheClear() {
      this.__data__ = [];
      this.size = 0;
    }
    function listCacheDelete(key) {
      var data = this.__data__, index = assocIndexOf(data, key);
      if (index < 0) {
        return false;
      }
      var lastIndex = data.length - 1;
      if (index == lastIndex) {
        data.pop();
      } else {
        splice.call(data, index, 1);
      }
      --this.size;
      return true;
    }
    function listCacheGet(key) {
      var data = this.__data__, index = assocIndexOf(data, key);
      return index < 0 ? void 0 : data[index][1];
    }
    function listCacheHas(key) {
      return assocIndexOf(this.__data__, key) > -1;
    }
    function listCacheSet(key, value) {
      var data = this.__data__, index = assocIndexOf(data, key);
      if (index < 0) {
        ++this.size;
        data.push([key, value]);
      } else {
        data[index][1] = value;
      }
      return this;
    }
    ListCache.prototype.clear = listCacheClear;
    ListCache.prototype["delete"] = listCacheDelete;
    ListCache.prototype.get = listCacheGet;
    ListCache.prototype.has = listCacheHas;
    ListCache.prototype.set = listCacheSet;
    function MapCache(entries) {
      var index = -1, length = entries == null ? 0 : entries.length;
      this.clear();
      while (++index < length) {
        var entry = entries[index];
        this.set(entry[0], entry[1]);
      }
    }
    function mapCacheClear() {
      this.size = 0;
      this.__data__ = {
        "hash": new Hash(),
        "map": new (Map2 || ListCache)(),
        "string": new Hash()
      };
    }
    function mapCacheDelete(key) {
      var result = getMapData(this, key)["delete"](key);
      this.size -= result ? 1 : 0;
      return result;
    }
    function mapCacheGet(key) {
      return getMapData(this, key).get(key);
    }
    function mapCacheHas(key) {
      return getMapData(this, key).has(key);
    }
    function mapCacheSet(key, value) {
      var data = getMapData(this, key), size = data.size;
      data.set(key, value);
      this.size += data.size == size ? 0 : 1;
      return this;
    }
    MapCache.prototype.clear = mapCacheClear;
    MapCache.prototype["delete"] = mapCacheDelete;
    MapCache.prototype.get = mapCacheGet;
    MapCache.prototype.has = mapCacheHas;
    MapCache.prototype.set = mapCacheSet;
    function SetCache(values) {
      var index = -1, length = values == null ? 0 : values.length;
      this.__data__ = new MapCache();
      while (++index < length) {
        this.add(values[index]);
      }
    }
    function setCacheAdd(value) {
      this.__data__.set(value, HASH_UNDEFINED);
      return this;
    }
    function setCacheHas(value) {
      return this.__data__.has(value);
    }
    SetCache.prototype.add = SetCache.prototype.push = setCacheAdd;
    SetCache.prototype.has = setCacheHas;
    function Stack(entries) {
      var data = this.__data__ = new ListCache(entries);
      this.size = data.size;
    }
    function stackClear() {
      this.__data__ = new ListCache();
      this.size = 0;
    }
    function stackDelete(key) {
      var data = this.__data__, result = data["delete"](key);
      this.size = data.size;
      return result;
    }
    function stackGet(key) {
      return this.__data__.get(key);
    }
    function stackHas(key) {
      return this.__data__.has(key);
    }
    function stackSet(key, value) {
      var data = this.__data__;
      if (data instanceof ListCache) {
        var pairs2 = data.__data__;
        if (!Map2 || pairs2.length < LARGE_ARRAY_SIZE - 1) {
          pairs2.push([key, value]);
          this.size = ++data.size;
          return this;
        }
        data = this.__data__ = new MapCache(pairs2);
      }
      data.set(key, value);
      this.size = data.size;
      return this;
    }
    Stack.prototype.clear = stackClear;
    Stack.prototype["delete"] = stackDelete;
    Stack.prototype.get = stackGet;
    Stack.prototype.has = stackHas;
    Stack.prototype.set = stackSet;
    function arrayLikeKeys(value, inherited) {
      var isArr = isArray(value), isArg = !isArr && isArguments(value), isBuff = !isArr && !isArg && isBuffer(value), isType = !isArr && !isArg && !isBuff && isTypedArray(value), skipIndexes = isArr || isArg || isBuff || isType, result = skipIndexes ? baseTimes(value.length, String) : [], length = result.length;
      for (var key in value) {
        if (hasOwnProperty.call(value, key) && !(skipIndexes && // Safari 9 has enumerable `arguments.length` in strict mode.
        (key == "length" || // Node.js 0.10 has enumerable non-index properties on buffers.
        isBuff && (key == "offset" || key == "parent") || // PhantomJS 2 has enumerable non-index properties on typed arrays.
        isType && (key == "buffer" || key == "byteLength" || key == "byteOffset") || // Skip index properties.
        isIndex(key, length)))) {
          result.push(key);
        }
      }
      return result;
    }
    function assocIndexOf(array, key) {
      var length = array.length;
      while (length--) {
        if (eq(array[length][0], key)) {
          return length;
        }
      }
      return -1;
    }
    function baseGetAllKeys(object, keysFunc, symbolsFunc) {
      var result = keysFunc(object);
      return isArray(object) ? result : arrayPush(result, symbolsFunc(object));
    }
    function baseGetTag(value) {
      if (value == null) {
        return value === void 0 ? undefinedTag : nullTag;
      }
      return symToStringTag && symToStringTag in Object(value) ? getRawTag(value) : objectToString(value);
    }
    function baseIsArguments(value) {
      return isObjectLike(value) && baseGetTag(value) == argsTag;
    }
    function baseIsEqual(value, other, bitmask, customizer, stack) {
      if (value === other) {
        return true;
      }
      if (value == null || other == null || !isObjectLike(value) && !isObjectLike(other)) {
        return value !== value && other !== other;
      }
      return baseIsEqualDeep(value, other, bitmask, customizer, baseIsEqual, stack);
    }
    function baseIsEqualDeep(object, other, bitmask, customizer, equalFunc, stack) {
      var objIsArr = isArray(object), othIsArr = isArray(other), objTag = objIsArr ? arrayTag : getTag(object), othTag = othIsArr ? arrayTag : getTag(other);
      objTag = objTag == argsTag ? objectTag : objTag;
      othTag = othTag == argsTag ? objectTag : othTag;
      var objIsObj = objTag == objectTag, othIsObj = othTag == objectTag, isSameTag = objTag == othTag;
      if (isSameTag && isBuffer(object)) {
        if (!isBuffer(other)) {
          return false;
        }
        objIsArr = true;
        objIsObj = false;
      }
      if (isSameTag && !objIsObj) {
        stack || (stack = new Stack());
        return objIsArr || isTypedArray(object) ? equalArrays(object, other, bitmask, customizer, equalFunc, stack) : equalByTag(object, other, objTag, bitmask, customizer, equalFunc, stack);
      }
      if (!(bitmask & COMPARE_PARTIAL_FLAG)) {
        var objIsWrapped = objIsObj && hasOwnProperty.call(object, "__wrapped__"), othIsWrapped = othIsObj && hasOwnProperty.call(other, "__wrapped__");
        if (objIsWrapped || othIsWrapped) {
          var objUnwrapped = objIsWrapped ? object.value() : object, othUnwrapped = othIsWrapped ? other.value() : other;
          stack || (stack = new Stack());
          return equalFunc(objUnwrapped, othUnwrapped, bitmask, customizer, stack);
        }
      }
      if (!isSameTag) {
        return false;
      }
      stack || (stack = new Stack());
      return equalObjects(object, other, bitmask, customizer, equalFunc, stack);
    }
    function baseIsNative(value) {
      if (!isObject(value) || isMasked(value)) {
        return false;
      }
      var pattern = isFunction(value) ? reIsNative : reIsHostCtor;
      return pattern.test(toSource(value));
    }
    function baseIsTypedArray(value) {
      return isObjectLike(value) && isLength(value.length) && !!typedArrayTags[baseGetTag(value)];
    }
    function baseKeys(object) {
      if (!isPrototype(object)) {
        return nativeKeys(object);
      }
      var result = [];
      for (var key in Object(object)) {
        if (hasOwnProperty.call(object, key) && key != "constructor") {
          result.push(key);
        }
      }
      return result;
    }
    function equalArrays(array, other, bitmask, customizer, equalFunc, stack) {
      var isPartial = bitmask & COMPARE_PARTIAL_FLAG, arrLength = array.length, othLength = other.length;
      if (arrLength != othLength && !(isPartial && othLength > arrLength)) {
        return false;
      }
      var stacked = stack.get(array);
      if (stacked && stack.get(other)) {
        return stacked == other;
      }
      var index = -1, result = true, seen = bitmask & COMPARE_UNORDERED_FLAG ? new SetCache() : void 0;
      stack.set(array, other);
      stack.set(other, array);
      while (++index < arrLength) {
        var arrValue = array[index], othValue = other[index];
        if (customizer) {
          var compared = isPartial ? customizer(othValue, arrValue, index, other, array, stack) : customizer(arrValue, othValue, index, array, other, stack);
        }
        if (compared !== void 0) {
          if (compared) {
            continue;
          }
          result = false;
          break;
        }
        if (seen) {
          if (!arraySome(other, function(othValue2, othIndex) {
            if (!cacheHas(seen, othIndex) && (arrValue === othValue2 || equalFunc(arrValue, othValue2, bitmask, customizer, stack))) {
              return seen.push(othIndex);
            }
          })) {
            result = false;
            break;
          }
        } else if (!(arrValue === othValue || equalFunc(arrValue, othValue, bitmask, customizer, stack))) {
          result = false;
          break;
        }
      }
      stack["delete"](array);
      stack["delete"](other);
      return result;
    }
    function equalByTag(object, other, tag, bitmask, customizer, equalFunc, stack) {
      switch (tag) {
        case dataViewTag:
          if (object.byteLength != other.byteLength || object.byteOffset != other.byteOffset) {
            return false;
          }
          object = object.buffer;
          other = other.buffer;
        case arrayBufferTag:
          if (object.byteLength != other.byteLength || !equalFunc(new Uint8Array2(object), new Uint8Array2(other))) {
            return false;
          }
          return true;
        case boolTag:
        case dateTag:
        case numberTag:
          return eq(+object, +other);
        case errorTag:
          return object.name == other.name && object.message == other.message;
        case regexpTag:
        case stringTag:
          return object == other + "";
        case mapTag:
          var convert = mapToArray;
        case setTag:
          var isPartial = bitmask & COMPARE_PARTIAL_FLAG;
          convert || (convert = setToArray);
          if (object.size != other.size && !isPartial) {
            return false;
          }
          var stacked = stack.get(object);
          if (stacked) {
            return stacked == other;
          }
          bitmask |= COMPARE_UNORDERED_FLAG;
          stack.set(object, other);
          var result = equalArrays(convert(object), convert(other), bitmask, customizer, equalFunc, stack);
          stack["delete"](object);
          return result;
        case symbolTag:
          if (symbolValueOf) {
            return symbolValueOf.call(object) == symbolValueOf.call(other);
          }
      }
      return false;
    }
    function equalObjects(object, other, bitmask, customizer, equalFunc, stack) {
      var isPartial = bitmask & COMPARE_PARTIAL_FLAG, objProps = getAllKeys(object), objLength = objProps.length, othProps = getAllKeys(other), othLength = othProps.length;
      if (objLength != othLength && !isPartial) {
        return false;
      }
      var index = objLength;
      while (index--) {
        var key = objProps[index];
        if (!(isPartial ? key in other : hasOwnProperty.call(other, key))) {
          return false;
        }
      }
      var stacked = stack.get(object);
      if (stacked && stack.get(other)) {
        return stacked == other;
      }
      var result = true;
      stack.set(object, other);
      stack.set(other, object);
      var skipCtor = isPartial;
      while (++index < objLength) {
        key = objProps[index];
        var objValue = object[key], othValue = other[key];
        if (customizer) {
          var compared = isPartial ? customizer(othValue, objValue, key, other, object, stack) : customizer(objValue, othValue, key, object, other, stack);
        }
        if (!(compared === void 0 ? objValue === othValue || equalFunc(objValue, othValue, bitmask, customizer, stack) : compared)) {
          result = false;
          break;
        }
        skipCtor || (skipCtor = key == "constructor");
      }
      if (result && !skipCtor) {
        var objCtor = object.constructor, othCtor = other.constructor;
        if (objCtor != othCtor && ("constructor" in object && "constructor" in other) && !(typeof objCtor == "function" && objCtor instanceof objCtor && typeof othCtor == "function" && othCtor instanceof othCtor)) {
          result = false;
        }
      }
      stack["delete"](object);
      stack["delete"](other);
      return result;
    }
    function getAllKeys(object) {
      return baseGetAllKeys(object, keys, getSymbols);
    }
    function getMapData(map2, key) {
      var data = map2.__data__;
      return isKeyable(key) ? data[typeof key == "string" ? "string" : "hash"] : data.map;
    }
    function getNative(object, key) {
      var value = getValue(object, key);
      return baseIsNative(value) ? value : void 0;
    }
    function getRawTag(value) {
      var isOwn = hasOwnProperty.call(value, symToStringTag), tag = value[symToStringTag];
      try {
        value[symToStringTag] = void 0;
        var unmasked = true;
      } catch (e) {
      }
      var result = nativeObjectToString.call(value);
      if (unmasked) {
        if (isOwn) {
          value[symToStringTag] = tag;
        } else {
          delete value[symToStringTag];
        }
      }
      return result;
    }
    var getSymbols = !nativeGetSymbols ? stubArray : function(object) {
      if (object == null) {
        return [];
      }
      object = Object(object);
      return arrayFilter(nativeGetSymbols(object), function(symbol) {
        return propertyIsEnumerable.call(object, symbol);
      });
    };
    var getTag = baseGetTag;
    if (DataView && getTag(new DataView(new ArrayBuffer(1))) != dataViewTag || Map2 && getTag(new Map2()) != mapTag || Promise2 && getTag(Promise2.resolve()) != promiseTag || Set2 && getTag(new Set2()) != setTag || WeakMap && getTag(new WeakMap()) != weakMapTag) {
      getTag = function(value) {
        var result = baseGetTag(value), Ctor = result == objectTag ? value.constructor : void 0, ctorString = Ctor ? toSource(Ctor) : "";
        if (ctorString) {
          switch (ctorString) {
            case dataViewCtorString:
              return dataViewTag;
            case mapCtorString:
              return mapTag;
            case promiseCtorString:
              return promiseTag;
            case setCtorString:
              return setTag;
            case weakMapCtorString:
              return weakMapTag;
          }
        }
        return result;
      };
    }
    function isIndex(value, length) {
      length = length == null ? MAX_SAFE_INTEGER : length;
      return !!length && (typeof value == "number" || reIsUint.test(value)) && (value > -1 && value % 1 == 0 && value < length);
    }
    function isKeyable(value) {
      var type2 = typeof value;
      return type2 == "string" || type2 == "number" || type2 == "symbol" || type2 == "boolean" ? value !== "__proto__" : value === null;
    }
    function isMasked(func) {
      return !!maskSrcKey && maskSrcKey in func;
    }
    function isPrototype(value) {
      var Ctor = value && value.constructor, proto = typeof Ctor == "function" && Ctor.prototype || objectProto;
      return value === proto;
    }
    function objectToString(value) {
      return nativeObjectToString.call(value);
    }
    function toSource(func) {
      if (func != null) {
        try {
          return funcToString.call(func);
        } catch (e) {
        }
        try {
          return func + "";
        } catch (e) {
        }
      }
      return "";
    }
    function eq(value, other) {
      return value === other || value !== value && other !== other;
    }
    var isArguments = baseIsArguments(/* @__PURE__ */ (function() {
      return arguments;
    })()) ? baseIsArguments : function(value) {
      return isObjectLike(value) && hasOwnProperty.call(value, "callee") && !propertyIsEnumerable.call(value, "callee");
    };
    var isArray = Array.isArray;
    function isArrayLike(value) {
      return value != null && isLength(value.length) && !isFunction(value);
    }
    var isBuffer = nativeIsBuffer || stubFalse;
    function isEqual(value, other) {
      return baseIsEqual(value, other);
    }
    function isFunction(value) {
      if (!isObject(value)) {
        return false;
      }
      var tag = baseGetTag(value);
      return tag == funcTag || tag == genTag || tag == asyncTag || tag == proxyTag;
    }
    function isLength(value) {
      return typeof value == "number" && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
    }
    function isObject(value) {
      var type2 = typeof value;
      return value != null && (type2 == "object" || type2 == "function");
    }
    function isObjectLike(value) {
      return value != null && typeof value == "object";
    }
    var isTypedArray = nodeIsTypedArray ? baseUnary(nodeIsTypedArray) : baseIsTypedArray;
    function keys(object) {
      return isArrayLike(object) ? arrayLikeKeys(object) : baseKeys(object);
    }
    function stubArray() {
      return [];
    }
    function stubFalse() {
      return false;
    }
    module.exports = isEqual;
  })(lodash_isequal, lodash_isequal.exports);
  return lodash_isequal.exports;
}
var hasRequiredDownloadedUpdateHelper;
function requireDownloadedUpdateHelper() {
  if (hasRequiredDownloadedUpdateHelper) return DownloadedUpdateHelper;
  hasRequiredDownloadedUpdateHelper = 1;
  Object.defineProperty(DownloadedUpdateHelper, "__esModule", { value: true });
  DownloadedUpdateHelper.DownloadedUpdateHelper = void 0;
  DownloadedUpdateHelper.createTempUpdateFile = createTempUpdateFile;
  const crypto_1 = require$$0$3;
  const fs_1 = fs$1;
  const isEqual = requireLodash_isequal();
  const fs_extra_1 = /* @__PURE__ */ requireLib();
  const path$1 = path;
  let DownloadedUpdateHelper$1 = class DownloadedUpdateHelper {
    constructor(cacheDir) {
      this.cacheDir = cacheDir;
      this._file = null;
      this._packageFile = null;
      this.versionInfo = null;
      this.fileInfo = null;
      this._downloadedFileInfo = null;
    }
    get downloadedFileInfo() {
      return this._downloadedFileInfo;
    }
    get file() {
      return this._file;
    }
    get packageFile() {
      return this._packageFile;
    }
    get cacheDirForPendingUpdate() {
      return path$1.join(this.cacheDir, "pending");
    }
    async validateDownloadedPath(updateFile, updateInfo, fileInfo, logger) {
      if (this.versionInfo != null && this.file === updateFile && this.fileInfo != null) {
        if (isEqual(this.versionInfo, updateInfo) && isEqual(this.fileInfo.info, fileInfo.info) && await (0, fs_extra_1.pathExists)(updateFile)) {
          return updateFile;
        } else {
          return null;
        }
      }
      const cachedUpdateFile = await this.getValidCachedUpdateFile(fileInfo, logger);
      if (cachedUpdateFile === null) {
        return null;
      }
      logger.info(`Update has already been downloaded to ${updateFile}).`);
      this._file = cachedUpdateFile;
      return cachedUpdateFile;
    }
    async setDownloadedFile(downloadedFile, packageFile, versionInfo, fileInfo, updateFileName, isSaveCache) {
      this._file = downloadedFile;
      this._packageFile = packageFile;
      this.versionInfo = versionInfo;
      this.fileInfo = fileInfo;
      this._downloadedFileInfo = {
        fileName: updateFileName,
        sha512: fileInfo.info.sha512,
        isAdminRightsRequired: fileInfo.info.isAdminRightsRequired === true
      };
      if (isSaveCache) {
        await (0, fs_extra_1.outputJson)(this.getUpdateInfoFile(), this._downloadedFileInfo);
      }
    }
    async clear() {
      this._file = null;
      this._packageFile = null;
      this.versionInfo = null;
      this.fileInfo = null;
      await this.cleanCacheDirForPendingUpdate();
    }
    async cleanCacheDirForPendingUpdate() {
      try {
        await (0, fs_extra_1.emptyDir)(this.cacheDirForPendingUpdate);
      } catch (_ignore) {
      }
    }
    /**
     * Returns "update-info.json" which is created in the update cache directory's "pending" subfolder after the first update is downloaded.  If the update file does not exist then the cache is cleared and recreated.  If the update file exists then its properties are validated.
     * @param fileInfo
     * @param logger
     */
    async getValidCachedUpdateFile(fileInfo, logger) {
      const updateInfoFilePath = this.getUpdateInfoFile();
      const doesUpdateInfoFileExist = await (0, fs_extra_1.pathExists)(updateInfoFilePath);
      if (!doesUpdateInfoFileExist) {
        return null;
      }
      let cachedInfo;
      try {
        cachedInfo = await (0, fs_extra_1.readJson)(updateInfoFilePath);
      } catch (error2) {
        let message = `No cached update info available`;
        if (error2.code !== "ENOENT") {
          await this.cleanCacheDirForPendingUpdate();
          message += ` (error on read: ${error2.message})`;
        }
        logger.info(message);
        return null;
      }
      const isCachedInfoFileNameValid = (cachedInfo === null || cachedInfo === void 0 ? void 0 : cachedInfo.fileName) !== null;
      if (!isCachedInfoFileNameValid) {
        logger.warn(`Cached update info is corrupted: no fileName, directory for cached update will be cleaned`);
        await this.cleanCacheDirForPendingUpdate();
        return null;
      }
      if (fileInfo.info.sha512 !== cachedInfo.sha512) {
        logger.info(`Cached update sha512 checksum doesn't match the latest available update. New update must be downloaded. Cached: ${cachedInfo.sha512}, expected: ${fileInfo.info.sha512}. Directory for cached update will be cleaned`);
        await this.cleanCacheDirForPendingUpdate();
        return null;
      }
      const updateFile = path$1.join(this.cacheDirForPendingUpdate, cachedInfo.fileName);
      if (!await (0, fs_extra_1.pathExists)(updateFile)) {
        logger.info("Cached update file doesn't exist");
        return null;
      }
      const sha512 = await hashFile(updateFile);
      if (fileInfo.info.sha512 !== sha512) {
        logger.warn(`Sha512 checksum doesn't match the latest available update. New update must be downloaded. Cached: ${sha512}, expected: ${fileInfo.info.sha512}`);
        await this.cleanCacheDirForPendingUpdate();
        return null;
      }
      this._downloadedFileInfo = cachedInfo;
      return updateFile;
    }
    getUpdateInfoFile() {
      return path$1.join(this.cacheDirForPendingUpdate, "update-info.json");
    }
  };
  DownloadedUpdateHelper.DownloadedUpdateHelper = DownloadedUpdateHelper$1;
  function hashFile(file2, algorithm = "sha512", encoding = "base64", options) {
    return new Promise((resolve, reject) => {
      const hash = (0, crypto_1.createHash)(algorithm);
      hash.on("error", reject).setEncoding(encoding);
      (0, fs_1.createReadStream)(file2, {
        ...options,
        highWaterMark: 1024 * 1024
        /* better to use more memory but hash faster */
      }).on("error", reject).on("end", () => {
        hash.end();
        resolve(hash.read());
      }).pipe(hash, { end: false });
    });
  }
  async function createTempUpdateFile(name, cacheDir, log) {
    let nameCounter = 0;
    let result = path$1.join(cacheDir, name);
    for (let i = 0; i < 3; i++) {
      try {
        await (0, fs_extra_1.unlink)(result);
        return result;
      } catch (e) {
        if (e.code === "ENOENT") {
          return result;
        }
        log.warn(`Error on remove temp update file: ${e}`);
        result = path$1.join(cacheDir, `${nameCounter++}-${name}`);
      }
    }
    return result;
  }
  return DownloadedUpdateHelper;
}
var ElectronAppAdapter = {};
var AppAdapter = {};
var hasRequiredAppAdapter;
function requireAppAdapter() {
  if (hasRequiredAppAdapter) return AppAdapter;
  hasRequiredAppAdapter = 1;
  Object.defineProperty(AppAdapter, "__esModule", { value: true });
  AppAdapter.getAppCacheDir = getAppCacheDir;
  const path$1 = path;
  const os_1 = require$$2;
  function getAppCacheDir() {
    const homedir = (0, os_1.homedir)();
    let result;
    if (process.platform === "win32") {
      result = process.env["LOCALAPPDATA"] || path$1.join(homedir, "AppData", "Local");
    } else if (process.platform === "darwin") {
      result = path$1.join(homedir, "Library", "Caches");
    } else {
      result = process.env["XDG_CACHE_HOME"] || path$1.join(homedir, ".cache");
    }
    return result;
  }
  return AppAdapter;
}
var hasRequiredElectronAppAdapter;
function requireElectronAppAdapter() {
  if (hasRequiredElectronAppAdapter) return ElectronAppAdapter;
  hasRequiredElectronAppAdapter = 1;
  Object.defineProperty(ElectronAppAdapter, "__esModule", { value: true });
  ElectronAppAdapter.ElectronAppAdapter = void 0;
  const path$1 = path;
  const AppAdapter_1 = requireAppAdapter();
  let ElectronAppAdapter$1 = class ElectronAppAdapter {
    constructor(app = require$$1$3.app) {
      this.app = app;
    }
    whenReady() {
      return this.app.whenReady();
    }
    get version() {
      return this.app.getVersion();
    }
    get name() {
      return this.app.getName();
    }
    get isPackaged() {
      return this.app.isPackaged === true;
    }
    get appUpdateConfigPath() {
      return this.isPackaged ? path$1.join(process.resourcesPath, "app-update.yml") : path$1.join(this.app.getAppPath(), "dev-app-update.yml");
    }
    get userDataPath() {
      return this.app.getPath("userData");
    }
    get baseCachePath() {
      return (0, AppAdapter_1.getAppCacheDir)();
    }
    quit() {
      this.app.quit();
    }
    relaunch() {
      this.app.relaunch();
    }
    onQuit(handler) {
      this.app.once("quit", (_, exitCode) => handler(exitCode));
    }
  };
  ElectronAppAdapter.ElectronAppAdapter = ElectronAppAdapter$1;
  return ElectronAppAdapter;
}
var electronHttpExecutor = {};
var hasRequiredElectronHttpExecutor;
function requireElectronHttpExecutor() {
  if (hasRequiredElectronHttpExecutor) return electronHttpExecutor;
  hasRequiredElectronHttpExecutor = 1;
  (function(exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ElectronHttpExecutor = exports.NET_SESSION_NAME = void 0;
    exports.getNetSession = getNetSession;
    const builder_util_runtime_1 = requireOut();
    exports.NET_SESSION_NAME = "electron-updater";
    function getNetSession() {
      return require$$1$3.session.fromPartition(exports.NET_SESSION_NAME, {
        cache: false
      });
    }
    class ElectronHttpExecutor extends builder_util_runtime_1.HttpExecutor {
      constructor(proxyLoginCallback) {
        super();
        this.proxyLoginCallback = proxyLoginCallback;
        this.cachedSession = null;
      }
      async download(url, destination, options) {
        return await options.cancellationToken.createPromise((resolve, reject, onCancel) => {
          const requestOptions = {
            headers: options.headers || void 0,
            redirect: "manual"
          };
          (0, builder_util_runtime_1.configureRequestUrl)(url, requestOptions);
          (0, builder_util_runtime_1.configureRequestOptions)(requestOptions);
          this.doDownload(requestOptions, {
            destination,
            options,
            onCancel,
            callback: (error2) => {
              if (error2 == null) {
                resolve(destination);
              } else {
                reject(error2);
              }
            },
            responseHandler: null
          }, 0);
        });
      }
      createRequest(options, callback) {
        if (options.headers && options.headers.Host) {
          options.host = options.headers.Host;
          delete options.headers.Host;
        }
        if (this.cachedSession == null) {
          this.cachedSession = getNetSession();
        }
        const request = require$$1$3.net.request({
          ...options,
          session: this.cachedSession
        });
        request.on("response", callback);
        if (this.proxyLoginCallback != null) {
          request.on("login", this.proxyLoginCallback);
        }
        return request;
      }
      addRedirectHandlers(request, options, reject, redirectCount, handler) {
        request.on("redirect", (statusCode, method, redirectUrl) => {
          request.abort();
          if (redirectCount > this.maxRedirects) {
            reject(this.createMaxRedirectError());
          } else {
            handler(builder_util_runtime_1.HttpExecutor.prepareRedirectUrlOptions(redirectUrl, options));
          }
        });
      }
    }
    exports.ElectronHttpExecutor = ElectronHttpExecutor;
  })(electronHttpExecutor);
  return electronHttpExecutor;
}
var GenericProvider = {};
var util = {};
var lodash_escaperegexp;
var hasRequiredLodash_escaperegexp;
function requireLodash_escaperegexp() {
  if (hasRequiredLodash_escaperegexp) return lodash_escaperegexp;
  hasRequiredLodash_escaperegexp = 1;
  var symbolTag = "[object Symbol]";
  var reRegExpChar = /[\\^$.*+?()[\]{}|]/g, reHasRegExpChar = RegExp(reRegExpChar.source);
  var freeGlobal = typeof commonjsGlobal == "object" && commonjsGlobal && commonjsGlobal.Object === Object && commonjsGlobal;
  var freeSelf = typeof self == "object" && self && self.Object === Object && self;
  var root = freeGlobal || freeSelf || Function("return this")();
  var objectProto = Object.prototype;
  var objectToString = objectProto.toString;
  var Symbol2 = root.Symbol;
  var symbolProto = Symbol2 ? Symbol2.prototype : void 0, symbolToString = symbolProto ? symbolProto.toString : void 0;
  function baseToString(value) {
    if (typeof value == "string") {
      return value;
    }
    if (isSymbol(value)) {
      return symbolToString ? symbolToString.call(value) : "";
    }
    var result = value + "";
    return result == "0" && 1 / value == -Infinity ? "-0" : result;
  }
  function isObjectLike(value) {
    return !!value && typeof value == "object";
  }
  function isSymbol(value) {
    return typeof value == "symbol" || isObjectLike(value) && objectToString.call(value) == symbolTag;
  }
  function toString(value) {
    return value == null ? "" : baseToString(value);
  }
  function escapeRegExp(string) {
    string = toString(string);
    return string && reHasRegExpChar.test(string) ? string.replace(reRegExpChar, "\\$&") : string;
  }
  lodash_escaperegexp = escapeRegExp;
  return lodash_escaperegexp;
}
var hasRequiredUtil;
function requireUtil() {
  if (hasRequiredUtil) return util;
  hasRequiredUtil = 1;
  Object.defineProperty(util, "__esModule", { value: true });
  util.newBaseUrl = newBaseUrl;
  util.newUrlFromBase = newUrlFromBase;
  util.getChannelFilename = getChannelFilename;
  util.blockmapFiles = blockmapFiles;
  const url_1 = require$$4;
  const escapeRegExp = requireLodash_escaperegexp();
  function newBaseUrl(url) {
    const result = new url_1.URL(url);
    if (!result.pathname.endsWith("/")) {
      result.pathname += "/";
    }
    return result;
  }
  function newUrlFromBase(pathname, baseUrl, addRandomQueryToAvoidCaching = false) {
    const result = new url_1.URL(pathname, baseUrl);
    const search = baseUrl.search;
    if (search != null && search.length !== 0) {
      result.search = search;
    } else if (addRandomQueryToAvoidCaching) {
      result.search = `noCache=${Date.now().toString(32)}`;
    }
    return result;
  }
  function getChannelFilename(channel) {
    return `${channel}.yml`;
  }
  function blockmapFiles(baseUrl, oldVersion, newVersion) {
    const newBlockMapUrl = newUrlFromBase(`${baseUrl.pathname}.blockmap`, baseUrl);
    const oldBlockMapUrl = newUrlFromBase(`${baseUrl.pathname.replace(new RegExp(escapeRegExp(newVersion), "g"), oldVersion)}.blockmap`, baseUrl);
    return [oldBlockMapUrl, newBlockMapUrl];
  }
  return util;
}
var Provider = {};
var hasRequiredProvider;
function requireProvider() {
  if (hasRequiredProvider) return Provider;
  hasRequiredProvider = 1;
  Object.defineProperty(Provider, "__esModule", { value: true });
  Provider.Provider = void 0;
  Provider.findFile = findFile;
  Provider.parseUpdateInfo = parseUpdateInfo;
  Provider.getFileList = getFileList;
  Provider.resolveFiles = resolveFiles;
  const builder_util_runtime_1 = requireOut();
  const js_yaml_1 = requireJsYaml();
  const util_1 = requireUtil();
  let Provider$1 = class Provider {
    constructor(runtimeOptions) {
      this.runtimeOptions = runtimeOptions;
      this.requestHeaders = null;
      this.executor = runtimeOptions.executor;
    }
    get isUseMultipleRangeRequest() {
      return this.runtimeOptions.isUseMultipleRangeRequest !== false;
    }
    getChannelFilePrefix() {
      if (this.runtimeOptions.platform === "linux") {
        const arch = process.env["TEST_UPDATER_ARCH"] || process.arch;
        const archSuffix = arch === "x64" ? "" : `-${arch}`;
        return "-linux" + archSuffix;
      } else {
        return this.runtimeOptions.platform === "darwin" ? "-mac" : "";
      }
    }
    // due to historical reasons for windows we use channel name without platform specifier
    getDefaultChannelName() {
      return this.getCustomChannelName("latest");
    }
    getCustomChannelName(channel) {
      return `${channel}${this.getChannelFilePrefix()}`;
    }
    get fileExtraDownloadHeaders() {
      return null;
    }
    setRequestHeaders(value) {
      this.requestHeaders = value;
    }
    /**
     * Method to perform API request only to resolve update info, but not to download update.
     */
    httpRequest(url, headers, cancellationToken) {
      return this.executor.request(this.createRequestOptions(url, headers), cancellationToken);
    }
    createRequestOptions(url, headers) {
      const result = {};
      if (this.requestHeaders == null) {
        if (headers != null) {
          result.headers = headers;
        }
      } else {
        result.headers = headers == null ? this.requestHeaders : { ...this.requestHeaders, ...headers };
      }
      (0, builder_util_runtime_1.configureRequestUrl)(url, result);
      return result;
    }
  };
  Provider.Provider = Provider$1;
  function findFile(files, extension, not) {
    if (files.length === 0) {
      throw (0, builder_util_runtime_1.newError)("No files provided", "ERR_UPDATER_NO_FILES_PROVIDED");
    }
    const result = files.find((it) => it.url.pathname.toLowerCase().endsWith(`.${extension}`));
    if (result != null) {
      return result;
    } else if (not == null) {
      return files[0];
    } else {
      return files.find((fileInfo) => !not.some((ext) => fileInfo.url.pathname.toLowerCase().endsWith(`.${ext}`)));
    }
  }
  function parseUpdateInfo(rawData, channelFile, channelFileUrl) {
    if (rawData == null) {
      throw (0, builder_util_runtime_1.newError)(`Cannot parse update info from ${channelFile} in the latest release artifacts (${channelFileUrl}): rawData: null`, "ERR_UPDATER_INVALID_UPDATE_INFO");
    }
    let result;
    try {
      result = (0, js_yaml_1.load)(rawData);
    } catch (e) {
      throw (0, builder_util_runtime_1.newError)(`Cannot parse update info from ${channelFile} in the latest release artifacts (${channelFileUrl}): ${e.stack || e.message}, rawData: ${rawData}`, "ERR_UPDATER_INVALID_UPDATE_INFO");
    }
    return result;
  }
  function getFileList(updateInfo) {
    const files = updateInfo.files;
    if (files != null && files.length > 0) {
      return files;
    }
    if (updateInfo.path != null) {
      return [
        {
          url: updateInfo.path,
          sha2: updateInfo.sha2,
          sha512: updateInfo.sha512
        }
      ];
    } else {
      throw (0, builder_util_runtime_1.newError)(`No files provided: ${(0, builder_util_runtime_1.safeStringifyJson)(updateInfo)}`, "ERR_UPDATER_NO_FILES_PROVIDED");
    }
  }
  function resolveFiles(updateInfo, baseUrl, pathTransformer = (p) => p) {
    const files = getFileList(updateInfo);
    const result = files.map((fileInfo) => {
      if (fileInfo.sha2 == null && fileInfo.sha512 == null) {
        throw (0, builder_util_runtime_1.newError)(`Update info doesn't contain nor sha256 neither sha512 checksum: ${(0, builder_util_runtime_1.safeStringifyJson)(fileInfo)}`, "ERR_UPDATER_NO_CHECKSUM");
      }
      return {
        url: (0, util_1.newUrlFromBase)(pathTransformer(fileInfo.url), baseUrl),
        info: fileInfo
      };
    });
    const packages = updateInfo.packages;
    const packageInfo = packages == null ? null : packages[process.arch] || packages.ia32;
    if (packageInfo != null) {
      result[0].packageInfo = {
        ...packageInfo,
        path: (0, util_1.newUrlFromBase)(pathTransformer(packageInfo.path), baseUrl).href
      };
    }
    return result;
  }
  return Provider;
}
var hasRequiredGenericProvider;
function requireGenericProvider() {
  if (hasRequiredGenericProvider) return GenericProvider;
  hasRequiredGenericProvider = 1;
  Object.defineProperty(GenericProvider, "__esModule", { value: true });
  GenericProvider.GenericProvider = void 0;
  const builder_util_runtime_1 = requireOut();
  const util_1 = requireUtil();
  const Provider_1 = requireProvider();
  let GenericProvider$1 = class GenericProvider extends Provider_1.Provider {
    constructor(configuration, updater, runtimeOptions) {
      super(runtimeOptions);
      this.configuration = configuration;
      this.updater = updater;
      this.baseUrl = (0, util_1.newBaseUrl)(this.configuration.url);
    }
    get channel() {
      const result = this.updater.channel || this.configuration.channel;
      return result == null ? this.getDefaultChannelName() : this.getCustomChannelName(result);
    }
    async getLatestVersion() {
      const channelFile = (0, util_1.getChannelFilename)(this.channel);
      const channelUrl = (0, util_1.newUrlFromBase)(channelFile, this.baseUrl, this.updater.isAddNoCacheQuery);
      for (let attemptNumber = 0; ; attemptNumber++) {
        try {
          return (0, Provider_1.parseUpdateInfo)(await this.httpRequest(channelUrl), channelFile, channelUrl);
        } catch (e) {
          if (e instanceof builder_util_runtime_1.HttpError && e.statusCode === 404) {
            throw (0, builder_util_runtime_1.newError)(`Cannot find channel "${channelFile}" update info: ${e.stack || e.message}`, "ERR_UPDATER_CHANNEL_FILE_NOT_FOUND");
          } else if (e.code === "ECONNREFUSED") {
            if (attemptNumber < 3) {
              await new Promise((resolve, reject) => {
                try {
                  setTimeout(resolve, 1e3 * attemptNumber);
                } catch (e2) {
                  reject(e2);
                }
              });
              continue;
            }
          }
          throw e;
        }
      }
    }
    resolveFiles(updateInfo) {
      return (0, Provider_1.resolveFiles)(updateInfo, this.baseUrl);
    }
  };
  GenericProvider.GenericProvider = GenericProvider$1;
  return GenericProvider;
}
var providerFactory = {};
var BitbucketProvider = {};
var hasRequiredBitbucketProvider;
function requireBitbucketProvider() {
  if (hasRequiredBitbucketProvider) return BitbucketProvider;
  hasRequiredBitbucketProvider = 1;
  Object.defineProperty(BitbucketProvider, "__esModule", { value: true });
  BitbucketProvider.BitbucketProvider = void 0;
  const builder_util_runtime_1 = requireOut();
  const util_1 = requireUtil();
  const Provider_1 = requireProvider();
  let BitbucketProvider$1 = class BitbucketProvider extends Provider_1.Provider {
    constructor(configuration, updater, runtimeOptions) {
      super({
        ...runtimeOptions,
        isUseMultipleRangeRequest: false
      });
      this.configuration = configuration;
      this.updater = updater;
      const { owner, slug } = configuration;
      this.baseUrl = (0, util_1.newBaseUrl)(`https://api.bitbucket.org/2.0/repositories/${owner}/${slug}/downloads`);
    }
    get channel() {
      return this.updater.channel || this.configuration.channel || "latest";
    }
    async getLatestVersion() {
      const cancellationToken = new builder_util_runtime_1.CancellationToken();
      const channelFile = (0, util_1.getChannelFilename)(this.getCustomChannelName(this.channel));
      const channelUrl = (0, util_1.newUrlFromBase)(channelFile, this.baseUrl, this.updater.isAddNoCacheQuery);
      try {
        const updateInfo = await this.httpRequest(channelUrl, void 0, cancellationToken);
        return (0, Provider_1.parseUpdateInfo)(updateInfo, channelFile, channelUrl);
      } catch (e) {
        throw (0, builder_util_runtime_1.newError)(`Unable to find latest version on ${this.toString()}, please ensure release exists: ${e.stack || e.message}`, "ERR_UPDATER_LATEST_VERSION_NOT_FOUND");
      }
    }
    resolveFiles(updateInfo) {
      return (0, Provider_1.resolveFiles)(updateInfo, this.baseUrl);
    }
    toString() {
      const { owner, slug } = this.configuration;
      return `Bitbucket (owner: ${owner}, slug: ${slug}, channel: ${this.channel})`;
    }
  };
  BitbucketProvider.BitbucketProvider = BitbucketProvider$1;
  return BitbucketProvider;
}
var GitHubProvider = {};
var hasRequiredGitHubProvider;
function requireGitHubProvider() {
  if (hasRequiredGitHubProvider) return GitHubProvider;
  hasRequiredGitHubProvider = 1;
  Object.defineProperty(GitHubProvider, "__esModule", { value: true });
  GitHubProvider.GitHubProvider = GitHubProvider.BaseGitHubProvider = void 0;
  GitHubProvider.computeReleaseNotes = computeReleaseNotes;
  const builder_util_runtime_1 = requireOut();
  const semver2 = requireSemver();
  const url_1 = require$$4;
  const util_1 = requireUtil();
  const Provider_1 = requireProvider();
  const hrefRegExp = /\/tag\/([^/]+)$/;
  class BaseGitHubProvider extends Provider_1.Provider {
    constructor(options, defaultHost, runtimeOptions) {
      super({
        ...runtimeOptions,
        /* because GitHib uses S3 */
        isUseMultipleRangeRequest: false
      });
      this.options = options;
      this.baseUrl = (0, util_1.newBaseUrl)((0, builder_util_runtime_1.githubUrl)(options, defaultHost));
      const apiHost = defaultHost === "github.com" ? "api.github.com" : defaultHost;
      this.baseApiUrl = (0, util_1.newBaseUrl)((0, builder_util_runtime_1.githubUrl)(options, apiHost));
    }
    computeGithubBasePath(result) {
      const host = this.options.host;
      return host && !["github.com", "api.github.com"].includes(host) ? `/api/v3${result}` : result;
    }
  }
  GitHubProvider.BaseGitHubProvider = BaseGitHubProvider;
  let GitHubProvider$1 = class GitHubProvider extends BaseGitHubProvider {
    constructor(options, updater, runtimeOptions) {
      super(options, "github.com", runtimeOptions);
      this.options = options;
      this.updater = updater;
    }
    get channel() {
      const result = this.updater.channel || this.options.channel;
      return result == null ? this.getDefaultChannelName() : this.getCustomChannelName(result);
    }
    async getLatestVersion() {
      var _a, _b, _c, _d, _e;
      const cancellationToken = new builder_util_runtime_1.CancellationToken();
      const feedXml = await this.httpRequest((0, util_1.newUrlFromBase)(`${this.basePath}.atom`, this.baseUrl), {
        accept: "application/xml, application/atom+xml, text/xml, */*"
      }, cancellationToken);
      const feed = (0, builder_util_runtime_1.parseXml)(feedXml);
      let latestRelease = feed.element("entry", false, `No published versions on GitHub`);
      let tag = null;
      try {
        if (this.updater.allowPrerelease) {
          const currentChannel = ((_a = this.updater) === null || _a === void 0 ? void 0 : _a.channel) || ((_b = semver2.prerelease(this.updater.currentVersion)) === null || _b === void 0 ? void 0 : _b[0]) || null;
          if (currentChannel === null) {
            tag = hrefRegExp.exec(latestRelease.element("link").attribute("href"))[1];
          } else {
            for (const element of feed.getElements("entry")) {
              const hrefElement = hrefRegExp.exec(element.element("link").attribute("href"));
              if (hrefElement === null)
                continue;
              const hrefTag = hrefElement[1];
              const hrefChannel = ((_c = semver2.prerelease(hrefTag)) === null || _c === void 0 ? void 0 : _c[0]) || null;
              const shouldFetchVersion = !currentChannel || ["alpha", "beta"].includes(currentChannel);
              const isCustomChannel = hrefChannel !== null && !["alpha", "beta"].includes(String(hrefChannel));
              const channelMismatch = currentChannel === "beta" && hrefChannel === "alpha";
              if (shouldFetchVersion && !isCustomChannel && !channelMismatch) {
                tag = hrefTag;
                break;
              }
              const isNextPreRelease = hrefChannel && hrefChannel === currentChannel;
              if (isNextPreRelease) {
                tag = hrefTag;
                break;
              }
            }
          }
        } else {
          tag = await this.getLatestTagName(cancellationToken);
          for (const element of feed.getElements("entry")) {
            if (hrefRegExp.exec(element.element("link").attribute("href"))[1] === tag) {
              latestRelease = element;
              break;
            }
          }
        }
      } catch (e) {
        throw (0, builder_util_runtime_1.newError)(`Cannot parse releases feed: ${e.stack || e.message},
XML:
${feedXml}`, "ERR_UPDATER_INVALID_RELEASE_FEED");
      }
      if (tag == null) {
        throw (0, builder_util_runtime_1.newError)(`No published versions on GitHub`, "ERR_UPDATER_NO_PUBLISHED_VERSIONS");
      }
      let rawData;
      let channelFile = "";
      let channelFileUrl = "";
      const fetchData = async (channelName) => {
        channelFile = (0, util_1.getChannelFilename)(channelName);
        channelFileUrl = (0, util_1.newUrlFromBase)(this.getBaseDownloadPath(String(tag), channelFile), this.baseUrl);
        const requestOptions = this.createRequestOptions(channelFileUrl);
        try {
          return await this.executor.request(requestOptions, cancellationToken);
        } catch (e) {
          if (e instanceof builder_util_runtime_1.HttpError && e.statusCode === 404) {
            throw (0, builder_util_runtime_1.newError)(`Cannot find ${channelFile} in the latest release artifacts (${channelFileUrl}): ${e.stack || e.message}`, "ERR_UPDATER_CHANNEL_FILE_NOT_FOUND");
          }
          throw e;
        }
      };
      try {
        let channel = this.channel;
        if (this.updater.allowPrerelease && ((_d = semver2.prerelease(tag)) === null || _d === void 0 ? void 0 : _d[0])) {
          channel = this.getCustomChannelName(String((_e = semver2.prerelease(tag)) === null || _e === void 0 ? void 0 : _e[0]));
        }
        rawData = await fetchData(channel);
      } catch (e) {
        if (this.updater.allowPrerelease) {
          rawData = await fetchData(this.getDefaultChannelName());
        } else {
          throw e;
        }
      }
      const result = (0, Provider_1.parseUpdateInfo)(rawData, channelFile, channelFileUrl);
      if (result.releaseName == null) {
        result.releaseName = latestRelease.elementValueOrEmpty("title");
      }
      if (result.releaseNotes == null) {
        result.releaseNotes = computeReleaseNotes(this.updater.currentVersion, this.updater.fullChangelog, feed, latestRelease);
      }
      return {
        tag,
        ...result
      };
    }
    async getLatestTagName(cancellationToken) {
      const options = this.options;
      const url = options.host == null || options.host === "github.com" ? (0, util_1.newUrlFromBase)(`${this.basePath}/latest`, this.baseUrl) : new url_1.URL(`${this.computeGithubBasePath(`/repos/${options.owner}/${options.repo}/releases`)}/latest`, this.baseApiUrl);
      try {
        const rawData = await this.httpRequest(url, { Accept: "application/json" }, cancellationToken);
        if (rawData == null) {
          return null;
        }
        const releaseInfo = JSON.parse(rawData);
        return releaseInfo.tag_name;
      } catch (e) {
        throw (0, builder_util_runtime_1.newError)(`Unable to find latest version on GitHub (${url}), please ensure a production release exists: ${e.stack || e.message}`, "ERR_UPDATER_LATEST_VERSION_NOT_FOUND");
      }
    }
    get basePath() {
      return `/${this.options.owner}/${this.options.repo}/releases`;
    }
    resolveFiles(updateInfo) {
      return (0, Provider_1.resolveFiles)(updateInfo, this.baseUrl, (p) => this.getBaseDownloadPath(updateInfo.tag, p.replace(/ /g, "-")));
    }
    getBaseDownloadPath(tag, fileName) {
      return `${this.basePath}/download/${tag}/${fileName}`;
    }
  };
  GitHubProvider.GitHubProvider = GitHubProvider$1;
  function getNoteValue(parent) {
    const result = parent.elementValueOrEmpty("content");
    return result === "No content." ? "" : result;
  }
  function computeReleaseNotes(currentVersion, isFullChangelog, feed, latestRelease) {
    if (!isFullChangelog) {
      return getNoteValue(latestRelease);
    }
    const releaseNotes = [];
    for (const release of feed.getElements("entry")) {
      const versionRelease = /\/tag\/v?([^/]+)$/.exec(release.element("link").attribute("href"))[1];
      if (semver2.lt(currentVersion, versionRelease)) {
        releaseNotes.push({
          version: versionRelease,
          note: getNoteValue(release)
        });
      }
    }
    return releaseNotes.sort((a, b) => semver2.rcompare(a.version, b.version));
  }
  return GitHubProvider;
}
var KeygenProvider = {};
var hasRequiredKeygenProvider;
function requireKeygenProvider() {
  if (hasRequiredKeygenProvider) return KeygenProvider;
  hasRequiredKeygenProvider = 1;
  Object.defineProperty(KeygenProvider, "__esModule", { value: true });
  KeygenProvider.KeygenProvider = void 0;
  const builder_util_runtime_1 = requireOut();
  const util_1 = requireUtil();
  const Provider_1 = requireProvider();
  let KeygenProvider$1 = class KeygenProvider extends Provider_1.Provider {
    constructor(configuration, updater, runtimeOptions) {
      super({
        ...runtimeOptions,
        isUseMultipleRangeRequest: false
      });
      this.configuration = configuration;
      this.updater = updater;
      this.defaultHostname = "api.keygen.sh";
      const host = this.configuration.host || this.defaultHostname;
      this.baseUrl = (0, util_1.newBaseUrl)(`https://${host}/v1/accounts/${this.configuration.account}/artifacts?product=${this.configuration.product}`);
    }
    get channel() {
      return this.updater.channel || this.configuration.channel || "stable";
    }
    async getLatestVersion() {
      const cancellationToken = new builder_util_runtime_1.CancellationToken();
      const channelFile = (0, util_1.getChannelFilename)(this.getCustomChannelName(this.channel));
      const channelUrl = (0, util_1.newUrlFromBase)(channelFile, this.baseUrl, this.updater.isAddNoCacheQuery);
      try {
        const updateInfo = await this.httpRequest(channelUrl, {
          Accept: "application/vnd.api+json",
          "Keygen-Version": "1.1"
        }, cancellationToken);
        return (0, Provider_1.parseUpdateInfo)(updateInfo, channelFile, channelUrl);
      } catch (e) {
        throw (0, builder_util_runtime_1.newError)(`Unable to find latest version on ${this.toString()}, please ensure release exists: ${e.stack || e.message}`, "ERR_UPDATER_LATEST_VERSION_NOT_FOUND");
      }
    }
    resolveFiles(updateInfo) {
      return (0, Provider_1.resolveFiles)(updateInfo, this.baseUrl);
    }
    toString() {
      const { account, product, platform } = this.configuration;
      return `Keygen (account: ${account}, product: ${product}, platform: ${platform}, channel: ${this.channel})`;
    }
  };
  KeygenProvider.KeygenProvider = KeygenProvider$1;
  return KeygenProvider;
}
var PrivateGitHubProvider = {};
var hasRequiredPrivateGitHubProvider;
function requirePrivateGitHubProvider() {
  if (hasRequiredPrivateGitHubProvider) return PrivateGitHubProvider;
  hasRequiredPrivateGitHubProvider = 1;
  Object.defineProperty(PrivateGitHubProvider, "__esModule", { value: true });
  PrivateGitHubProvider.PrivateGitHubProvider = void 0;
  const builder_util_runtime_1 = requireOut();
  const js_yaml_1 = requireJsYaml();
  const path$1 = path;
  const url_1 = require$$4;
  const util_1 = requireUtil();
  const GitHubProvider_1 = requireGitHubProvider();
  const Provider_1 = requireProvider();
  let PrivateGitHubProvider$1 = class PrivateGitHubProvider extends GitHubProvider_1.BaseGitHubProvider {
    constructor(options, updater, token, runtimeOptions) {
      super(options, "api.github.com", runtimeOptions);
      this.updater = updater;
      this.token = token;
    }
    createRequestOptions(url, headers) {
      const result = super.createRequestOptions(url, headers);
      result.redirect = "manual";
      return result;
    }
    async getLatestVersion() {
      const cancellationToken = new builder_util_runtime_1.CancellationToken();
      const channelFile = (0, util_1.getChannelFilename)(this.getDefaultChannelName());
      const releaseInfo = await this.getLatestVersionInfo(cancellationToken);
      const asset = releaseInfo.assets.find((it) => it.name === channelFile);
      if (asset == null) {
        throw (0, builder_util_runtime_1.newError)(`Cannot find ${channelFile} in the release ${releaseInfo.html_url || releaseInfo.name}`, "ERR_UPDATER_CHANNEL_FILE_NOT_FOUND");
      }
      const url = new url_1.URL(asset.url);
      let result;
      try {
        result = (0, js_yaml_1.load)(await this.httpRequest(url, this.configureHeaders("application/octet-stream"), cancellationToken));
      } catch (e) {
        if (e instanceof builder_util_runtime_1.HttpError && e.statusCode === 404) {
          throw (0, builder_util_runtime_1.newError)(`Cannot find ${channelFile} in the latest release artifacts (${url}): ${e.stack || e.message}`, "ERR_UPDATER_CHANNEL_FILE_NOT_FOUND");
        }
        throw e;
      }
      result.assets = releaseInfo.assets;
      return result;
    }
    get fileExtraDownloadHeaders() {
      return this.configureHeaders("application/octet-stream");
    }
    configureHeaders(accept) {
      return {
        accept,
        authorization: `token ${this.token}`
      };
    }
    async getLatestVersionInfo(cancellationToken) {
      const allowPrerelease = this.updater.allowPrerelease;
      let basePath = this.basePath;
      if (!allowPrerelease) {
        basePath = `${basePath}/latest`;
      }
      const url = (0, util_1.newUrlFromBase)(basePath, this.baseUrl);
      try {
        const version = JSON.parse(await this.httpRequest(url, this.configureHeaders("application/vnd.github.v3+json"), cancellationToken));
        if (allowPrerelease) {
          return version.find((it) => it.prerelease) || version[0];
        } else {
          return version;
        }
      } catch (e) {
        throw (0, builder_util_runtime_1.newError)(`Unable to find latest version on GitHub (${url}), please ensure a production release exists: ${e.stack || e.message}`, "ERR_UPDATER_LATEST_VERSION_NOT_FOUND");
      }
    }
    get basePath() {
      return this.computeGithubBasePath(`/repos/${this.options.owner}/${this.options.repo}/releases`);
    }
    resolveFiles(updateInfo) {
      return (0, Provider_1.getFileList)(updateInfo).map((it) => {
        const name = path$1.posix.basename(it.url).replace(/ /g, "-");
        const asset = updateInfo.assets.find((it2) => it2 != null && it2.name === name);
        if (asset == null) {
          throw (0, builder_util_runtime_1.newError)(`Cannot find asset "${name}" in: ${JSON.stringify(updateInfo.assets, null, 2)}`, "ERR_UPDATER_ASSET_NOT_FOUND");
        }
        return {
          url: new url_1.URL(asset.url),
          info: it
        };
      });
    }
  };
  PrivateGitHubProvider.PrivateGitHubProvider = PrivateGitHubProvider$1;
  return PrivateGitHubProvider;
}
var hasRequiredProviderFactory;
function requireProviderFactory() {
  if (hasRequiredProviderFactory) return providerFactory;
  hasRequiredProviderFactory = 1;
  Object.defineProperty(providerFactory, "__esModule", { value: true });
  providerFactory.isUrlProbablySupportMultiRangeRequests = isUrlProbablySupportMultiRangeRequests;
  providerFactory.createClient = createClient;
  const builder_util_runtime_1 = requireOut();
  const BitbucketProvider_1 = requireBitbucketProvider();
  const GenericProvider_1 = requireGenericProvider();
  const GitHubProvider_1 = requireGitHubProvider();
  const KeygenProvider_1 = requireKeygenProvider();
  const PrivateGitHubProvider_1 = requirePrivateGitHubProvider();
  function isUrlProbablySupportMultiRangeRequests(url) {
    return !url.includes("s3.amazonaws.com");
  }
  function createClient(data, updater, runtimeOptions) {
    if (typeof data === "string") {
      throw (0, builder_util_runtime_1.newError)("Please pass PublishConfiguration object", "ERR_UPDATER_INVALID_PROVIDER_CONFIGURATION");
    }
    const provider = data.provider;
    switch (provider) {
      case "github": {
        const githubOptions = data;
        const token = (githubOptions.private ? process.env["GH_TOKEN"] || process.env["GITHUB_TOKEN"] : null) || githubOptions.token;
        if (token == null) {
          return new GitHubProvider_1.GitHubProvider(githubOptions, updater, runtimeOptions);
        } else {
          return new PrivateGitHubProvider_1.PrivateGitHubProvider(githubOptions, updater, token, runtimeOptions);
        }
      }
      case "bitbucket":
        return new BitbucketProvider_1.BitbucketProvider(data, updater, runtimeOptions);
      case "keygen":
        return new KeygenProvider_1.KeygenProvider(data, updater, runtimeOptions);
      case "s3":
      case "spaces":
        return new GenericProvider_1.GenericProvider({
          provider: "generic",
          url: (0, builder_util_runtime_1.getS3LikeProviderBaseUrl)(data),
          channel: data.channel || null
        }, updater, {
          ...runtimeOptions,
          // https://github.com/minio/minio/issues/5285#issuecomment-350428955
          isUseMultipleRangeRequest: false
        });
      case "generic": {
        const options = data;
        return new GenericProvider_1.GenericProvider(options, updater, {
          ...runtimeOptions,
          isUseMultipleRangeRequest: options.useMultipleRangeRequest !== false && isUrlProbablySupportMultiRangeRequests(options.url)
        });
      }
      case "custom": {
        const options = data;
        const constructor = options.updateProvider;
        if (!constructor) {
          throw (0, builder_util_runtime_1.newError)("Custom provider not specified", "ERR_UPDATER_INVALID_PROVIDER_CONFIGURATION");
        }
        return new constructor(options, updater, runtimeOptions);
      }
      default:
        throw (0, builder_util_runtime_1.newError)(`Unsupported provider: ${provider}`, "ERR_UPDATER_UNSUPPORTED_PROVIDER");
    }
  }
  return providerFactory;
}
var GenericDifferentialDownloader = {};
var DifferentialDownloader = {};
var DataSplitter = {};
var downloadPlanBuilder = {};
var hasRequiredDownloadPlanBuilder;
function requireDownloadPlanBuilder() {
  if (hasRequiredDownloadPlanBuilder) return downloadPlanBuilder;
  hasRequiredDownloadPlanBuilder = 1;
  Object.defineProperty(downloadPlanBuilder, "__esModule", { value: true });
  downloadPlanBuilder.OperationKind = void 0;
  downloadPlanBuilder.computeOperations = computeOperations;
  var OperationKind;
  (function(OperationKind2) {
    OperationKind2[OperationKind2["COPY"] = 0] = "COPY";
    OperationKind2[OperationKind2["DOWNLOAD"] = 1] = "DOWNLOAD";
  })(OperationKind || (downloadPlanBuilder.OperationKind = OperationKind = {}));
  function computeOperations(oldBlockMap, newBlockMap, logger) {
    const nameToOldBlocks = buildBlockFileMap(oldBlockMap.files);
    const nameToNewBlocks = buildBlockFileMap(newBlockMap.files);
    let lastOperation = null;
    const blockMapFile = newBlockMap.files[0];
    const operations = [];
    const name = blockMapFile.name;
    const oldEntry = nameToOldBlocks.get(name);
    if (oldEntry == null) {
      throw new Error(`no file ${name} in old blockmap`);
    }
    const newFile = nameToNewBlocks.get(name);
    let changedBlockCount = 0;
    const { checksumToOffset: checksumToOldOffset, checksumToOldSize } = buildChecksumMap(nameToOldBlocks.get(name), oldEntry.offset, logger);
    let newOffset = blockMapFile.offset;
    for (let i = 0; i < newFile.checksums.length; newOffset += newFile.sizes[i], i++) {
      const blockSize = newFile.sizes[i];
      const checksum = newFile.checksums[i];
      let oldOffset = checksumToOldOffset.get(checksum);
      if (oldOffset != null && checksumToOldSize.get(checksum) !== blockSize) {
        logger.warn(`Checksum ("${checksum}") matches, but size differs (old: ${checksumToOldSize.get(checksum)}, new: ${blockSize})`);
        oldOffset = void 0;
      }
      if (oldOffset === void 0) {
        changedBlockCount++;
        if (lastOperation != null && lastOperation.kind === OperationKind.DOWNLOAD && lastOperation.end === newOffset) {
          lastOperation.end += blockSize;
        } else {
          lastOperation = {
            kind: OperationKind.DOWNLOAD,
            start: newOffset,
            end: newOffset + blockSize
            // oldBlocks: null,
          };
          validateAndAdd(lastOperation, operations, checksum, i);
        }
      } else {
        if (lastOperation != null && lastOperation.kind === OperationKind.COPY && lastOperation.end === oldOffset) {
          lastOperation.end += blockSize;
        } else {
          lastOperation = {
            kind: OperationKind.COPY,
            start: oldOffset,
            end: oldOffset + blockSize
            // oldBlocks: [checksum]
          };
          validateAndAdd(lastOperation, operations, checksum, i);
        }
      }
    }
    if (changedBlockCount > 0) {
      logger.info(`File${blockMapFile.name === "file" ? "" : " " + blockMapFile.name} has ${changedBlockCount} changed blocks`);
    }
    return operations;
  }
  const isValidateOperationRange = process.env["DIFFERENTIAL_DOWNLOAD_PLAN_BUILDER_VALIDATE_RANGES"] === "true";
  function validateAndAdd(operation, operations, checksum, index) {
    if (isValidateOperationRange && operations.length !== 0) {
      const lastOperation = operations[operations.length - 1];
      if (lastOperation.kind === operation.kind && operation.start < lastOperation.end && operation.start > lastOperation.start) {
        const min = [lastOperation.start, lastOperation.end, operation.start, operation.end].reduce((p, v) => p < v ? p : v);
        throw new Error(`operation (block index: ${index}, checksum: ${checksum}, kind: ${OperationKind[operation.kind]}) overlaps previous operation (checksum: ${checksum}):
abs: ${lastOperation.start} until ${lastOperation.end} and ${operation.start} until ${operation.end}
rel: ${lastOperation.start - min} until ${lastOperation.end - min} and ${operation.start - min} until ${operation.end - min}`);
      }
    }
    operations.push(operation);
  }
  function buildChecksumMap(file2, fileOffset, logger) {
    const checksumToOffset = /* @__PURE__ */ new Map();
    const checksumToSize = /* @__PURE__ */ new Map();
    let offset = fileOffset;
    for (let i = 0; i < file2.checksums.length; i++) {
      const checksum = file2.checksums[i];
      const size = file2.sizes[i];
      const existing = checksumToSize.get(checksum);
      if (existing === void 0) {
        checksumToOffset.set(checksum, offset);
        checksumToSize.set(checksum, size);
      } else if (logger.debug != null) {
        const sizeExplanation = existing === size ? "(same size)" : `(size: ${existing}, this size: ${size})`;
        logger.debug(`${checksum} duplicated in blockmap ${sizeExplanation}, it doesn't lead to broken differential downloader, just corresponding block will be skipped)`);
      }
      offset += size;
    }
    return { checksumToOffset, checksumToOldSize: checksumToSize };
  }
  function buildBlockFileMap(list) {
    const result = /* @__PURE__ */ new Map();
    for (const item of list) {
      result.set(item.name, item);
    }
    return result;
  }
  return downloadPlanBuilder;
}
var hasRequiredDataSplitter;
function requireDataSplitter() {
  if (hasRequiredDataSplitter) return DataSplitter;
  hasRequiredDataSplitter = 1;
  Object.defineProperty(DataSplitter, "__esModule", { value: true });
  DataSplitter.DataSplitter = void 0;
  DataSplitter.copyData = copyData;
  const builder_util_runtime_1 = requireOut();
  const fs_1 = fs$1;
  const stream_1 = require$$0$1;
  const downloadPlanBuilder_1 = requireDownloadPlanBuilder();
  const DOUBLE_CRLF = Buffer.from("\r\n\r\n");
  var ReadState;
  (function(ReadState2) {
    ReadState2[ReadState2["INIT"] = 0] = "INIT";
    ReadState2[ReadState2["HEADER"] = 1] = "HEADER";
    ReadState2[ReadState2["BODY"] = 2] = "BODY";
  })(ReadState || (ReadState = {}));
  function copyData(task, out2, oldFileFd, reject, resolve) {
    const readStream = (0, fs_1.createReadStream)("", {
      fd: oldFileFd,
      autoClose: false,
      start: task.start,
      // end is inclusive
      end: task.end - 1
    });
    readStream.on("error", reject);
    readStream.once("end", resolve);
    readStream.pipe(out2, {
      end: false
    });
  }
  let DataSplitter$1 = class DataSplitter extends stream_1.Writable {
    constructor(out2, options, partIndexToTaskIndex, boundary, partIndexToLength, finishHandler) {
      super();
      this.out = out2;
      this.options = options;
      this.partIndexToTaskIndex = partIndexToTaskIndex;
      this.partIndexToLength = partIndexToLength;
      this.finishHandler = finishHandler;
      this.partIndex = -1;
      this.headerListBuffer = null;
      this.readState = ReadState.INIT;
      this.ignoreByteCount = 0;
      this.remainingPartDataCount = 0;
      this.actualPartLength = 0;
      this.boundaryLength = boundary.length + 4;
      this.ignoreByteCount = this.boundaryLength - 2;
    }
    get isFinished() {
      return this.partIndex === this.partIndexToLength.length;
    }
    // noinspection JSUnusedGlobalSymbols
    _write(data, encoding, callback) {
      if (this.isFinished) {
        console.error(`Trailing ignored data: ${data.length} bytes`);
        return;
      }
      this.handleData(data).then(callback).catch(callback);
    }
    async handleData(chunk) {
      let start = 0;
      if (this.ignoreByteCount !== 0 && this.remainingPartDataCount !== 0) {
        throw (0, builder_util_runtime_1.newError)("Internal error", "ERR_DATA_SPLITTER_BYTE_COUNT_MISMATCH");
      }
      if (this.ignoreByteCount > 0) {
        const toIgnore = Math.min(this.ignoreByteCount, chunk.length);
        this.ignoreByteCount -= toIgnore;
        start = toIgnore;
      } else if (this.remainingPartDataCount > 0) {
        const toRead = Math.min(this.remainingPartDataCount, chunk.length);
        this.remainingPartDataCount -= toRead;
        await this.processPartData(chunk, 0, toRead);
        start = toRead;
      }
      if (start === chunk.length) {
        return;
      }
      if (this.readState === ReadState.HEADER) {
        const headerListEnd = this.searchHeaderListEnd(chunk, start);
        if (headerListEnd === -1) {
          return;
        }
        start = headerListEnd;
        this.readState = ReadState.BODY;
        this.headerListBuffer = null;
      }
      while (true) {
        if (this.readState === ReadState.BODY) {
          this.readState = ReadState.INIT;
        } else {
          this.partIndex++;
          let taskIndex = this.partIndexToTaskIndex.get(this.partIndex);
          if (taskIndex == null) {
            if (this.isFinished) {
              taskIndex = this.options.end;
            } else {
              throw (0, builder_util_runtime_1.newError)("taskIndex is null", "ERR_DATA_SPLITTER_TASK_INDEX_IS_NULL");
            }
          }
          const prevTaskIndex = this.partIndex === 0 ? this.options.start : this.partIndexToTaskIndex.get(this.partIndex - 1) + 1;
          if (prevTaskIndex < taskIndex) {
            await this.copyExistingData(prevTaskIndex, taskIndex);
          } else if (prevTaskIndex > taskIndex) {
            throw (0, builder_util_runtime_1.newError)("prevTaskIndex must be < taskIndex", "ERR_DATA_SPLITTER_TASK_INDEX_ASSERT_FAILED");
          }
          if (this.isFinished) {
            this.onPartEnd();
            this.finishHandler();
            return;
          }
          start = this.searchHeaderListEnd(chunk, start);
          if (start === -1) {
            this.readState = ReadState.HEADER;
            return;
          }
        }
        const partLength = this.partIndexToLength[this.partIndex];
        const end = start + partLength;
        const effectiveEnd = Math.min(end, chunk.length);
        await this.processPartStarted(chunk, start, effectiveEnd);
        this.remainingPartDataCount = partLength - (effectiveEnd - start);
        if (this.remainingPartDataCount > 0) {
          return;
        }
        start = end + this.boundaryLength;
        if (start >= chunk.length) {
          this.ignoreByteCount = this.boundaryLength - (chunk.length - end);
          return;
        }
      }
    }
    copyExistingData(index, end) {
      return new Promise((resolve, reject) => {
        const w = () => {
          if (index === end) {
            resolve();
            return;
          }
          const task = this.options.tasks[index];
          if (task.kind !== downloadPlanBuilder_1.OperationKind.COPY) {
            reject(new Error("Task kind must be COPY"));
            return;
          }
          copyData(task, this.out, this.options.oldFileFd, reject, () => {
            index++;
            w();
          });
        };
        w();
      });
    }
    searchHeaderListEnd(chunk, readOffset) {
      const headerListEnd = chunk.indexOf(DOUBLE_CRLF, readOffset);
      if (headerListEnd !== -1) {
        return headerListEnd + DOUBLE_CRLF.length;
      }
      const partialChunk = readOffset === 0 ? chunk : chunk.slice(readOffset);
      if (this.headerListBuffer == null) {
        this.headerListBuffer = partialChunk;
      } else {
        this.headerListBuffer = Buffer.concat([this.headerListBuffer, partialChunk]);
      }
      return -1;
    }
    onPartEnd() {
      const expectedLength = this.partIndexToLength[this.partIndex - 1];
      if (this.actualPartLength !== expectedLength) {
        throw (0, builder_util_runtime_1.newError)(`Expected length: ${expectedLength} differs from actual: ${this.actualPartLength}`, "ERR_DATA_SPLITTER_LENGTH_MISMATCH");
      }
      this.actualPartLength = 0;
    }
    processPartStarted(data, start, end) {
      if (this.partIndex !== 0) {
        this.onPartEnd();
      }
      return this.processPartData(data, start, end);
    }
    processPartData(data, start, end) {
      this.actualPartLength += end - start;
      const out2 = this.out;
      if (out2.write(start === 0 && data.length === end ? data : data.slice(start, end))) {
        return Promise.resolve();
      } else {
        return new Promise((resolve, reject) => {
          out2.on("error", reject);
          out2.once("drain", () => {
            out2.removeListener("error", reject);
            resolve();
          });
        });
      }
    }
  };
  DataSplitter.DataSplitter = DataSplitter$1;
  return DataSplitter;
}
var multipleRangeDownloader = {};
var hasRequiredMultipleRangeDownloader;
function requireMultipleRangeDownloader() {
  if (hasRequiredMultipleRangeDownloader) return multipleRangeDownloader;
  hasRequiredMultipleRangeDownloader = 1;
  Object.defineProperty(multipleRangeDownloader, "__esModule", { value: true });
  multipleRangeDownloader.executeTasksUsingMultipleRangeRequests = executeTasksUsingMultipleRangeRequests;
  multipleRangeDownloader.checkIsRangesSupported = checkIsRangesSupported;
  const builder_util_runtime_1 = requireOut();
  const DataSplitter_1 = requireDataSplitter();
  const downloadPlanBuilder_1 = requireDownloadPlanBuilder();
  function executeTasksUsingMultipleRangeRequests(differentialDownloader, tasks, out2, oldFileFd, reject) {
    const w = (taskOffset) => {
      if (taskOffset >= tasks.length) {
        if (differentialDownloader.fileMetadataBuffer != null) {
          out2.write(differentialDownloader.fileMetadataBuffer);
        }
        out2.end();
        return;
      }
      const nextOffset = taskOffset + 1e3;
      doExecuteTasks(differentialDownloader, {
        tasks,
        start: taskOffset,
        end: Math.min(tasks.length, nextOffset),
        oldFileFd
      }, out2, () => w(nextOffset), reject);
    };
    return w;
  }
  function doExecuteTasks(differentialDownloader, options, out2, resolve, reject) {
    let ranges = "bytes=";
    let partCount = 0;
    const partIndexToTaskIndex = /* @__PURE__ */ new Map();
    const partIndexToLength = [];
    for (let i = options.start; i < options.end; i++) {
      const task = options.tasks[i];
      if (task.kind === downloadPlanBuilder_1.OperationKind.DOWNLOAD) {
        ranges += `${task.start}-${task.end - 1}, `;
        partIndexToTaskIndex.set(partCount, i);
        partCount++;
        partIndexToLength.push(task.end - task.start);
      }
    }
    if (partCount <= 1) {
      const w = (index) => {
        if (index >= options.end) {
          resolve();
          return;
        }
        const task = options.tasks[index++];
        if (task.kind === downloadPlanBuilder_1.OperationKind.COPY) {
          (0, DataSplitter_1.copyData)(task, out2, options.oldFileFd, reject, () => w(index));
        } else {
          const requestOptions2 = differentialDownloader.createRequestOptions();
          requestOptions2.headers.Range = `bytes=${task.start}-${task.end - 1}`;
          const request2 = differentialDownloader.httpExecutor.createRequest(requestOptions2, (response) => {
            if (!checkIsRangesSupported(response, reject)) {
              return;
            }
            response.pipe(out2, {
              end: false
            });
            response.once("end", () => w(index));
          });
          differentialDownloader.httpExecutor.addErrorAndTimeoutHandlers(request2, reject);
          request2.end();
        }
      };
      w(options.start);
      return;
    }
    const requestOptions = differentialDownloader.createRequestOptions();
    requestOptions.headers.Range = ranges.substring(0, ranges.length - 2);
    const request = differentialDownloader.httpExecutor.createRequest(requestOptions, (response) => {
      if (!checkIsRangesSupported(response, reject)) {
        return;
      }
      const contentType = (0, builder_util_runtime_1.safeGetHeader)(response, "content-type");
      const m = /^multipart\/.+?(?:; boundary=(?:(?:"(.+)")|(?:([^\s]+))))$/i.exec(contentType);
      if (m == null) {
        reject(new Error(`Content-Type "multipart/byteranges" is expected, but got "${contentType}"`));
        return;
      }
      const dicer = new DataSplitter_1.DataSplitter(out2, options, partIndexToTaskIndex, m[1] || m[2], partIndexToLength, resolve);
      dicer.on("error", reject);
      response.pipe(dicer);
      response.on("end", () => {
        setTimeout(() => {
          request.abort();
          reject(new Error("Response ends without calling any handlers"));
        }, 1e4);
      });
    });
    differentialDownloader.httpExecutor.addErrorAndTimeoutHandlers(request, reject);
    request.end();
  }
  function checkIsRangesSupported(response, reject) {
    if (response.statusCode >= 400) {
      reject((0, builder_util_runtime_1.createHttpError)(response));
      return false;
    }
    if (response.statusCode !== 206) {
      const acceptRanges = (0, builder_util_runtime_1.safeGetHeader)(response, "accept-ranges");
      if (acceptRanges == null || acceptRanges === "none") {
        reject(new Error(`Server doesn't support Accept-Ranges (response code ${response.statusCode})`));
        return false;
      }
    }
    return true;
  }
  return multipleRangeDownloader;
}
var ProgressDifferentialDownloadCallbackTransform = {};
var hasRequiredProgressDifferentialDownloadCallbackTransform;
function requireProgressDifferentialDownloadCallbackTransform() {
  if (hasRequiredProgressDifferentialDownloadCallbackTransform) return ProgressDifferentialDownloadCallbackTransform;
  hasRequiredProgressDifferentialDownloadCallbackTransform = 1;
  Object.defineProperty(ProgressDifferentialDownloadCallbackTransform, "__esModule", { value: true });
  ProgressDifferentialDownloadCallbackTransform.ProgressDifferentialDownloadCallbackTransform = void 0;
  const stream_1 = require$$0$1;
  var OperationKind;
  (function(OperationKind2) {
    OperationKind2[OperationKind2["COPY"] = 0] = "COPY";
    OperationKind2[OperationKind2["DOWNLOAD"] = 1] = "DOWNLOAD";
  })(OperationKind || (OperationKind = {}));
  let ProgressDifferentialDownloadCallbackTransform$1 = class ProgressDifferentialDownloadCallbackTransform extends stream_1.Transform {
    constructor(progressDifferentialDownloadInfo, cancellationToken, onProgress) {
      super();
      this.progressDifferentialDownloadInfo = progressDifferentialDownloadInfo;
      this.cancellationToken = cancellationToken;
      this.onProgress = onProgress;
      this.start = Date.now();
      this.transferred = 0;
      this.delta = 0;
      this.expectedBytes = 0;
      this.index = 0;
      this.operationType = OperationKind.COPY;
      this.nextUpdate = this.start + 1e3;
    }
    _transform(chunk, encoding, callback) {
      if (this.cancellationToken.cancelled) {
        callback(new Error("cancelled"), null);
        return;
      }
      if (this.operationType == OperationKind.COPY) {
        callback(null, chunk);
        return;
      }
      this.transferred += chunk.length;
      this.delta += chunk.length;
      const now = Date.now();
      if (now >= this.nextUpdate && this.transferred !== this.expectedBytes && this.transferred !== this.progressDifferentialDownloadInfo.grandTotal) {
        this.nextUpdate = now + 1e3;
        this.onProgress({
          total: this.progressDifferentialDownloadInfo.grandTotal,
          delta: this.delta,
          transferred: this.transferred,
          percent: this.transferred / this.progressDifferentialDownloadInfo.grandTotal * 100,
          bytesPerSecond: Math.round(this.transferred / ((now - this.start) / 1e3))
        });
        this.delta = 0;
      }
      callback(null, chunk);
    }
    beginFileCopy() {
      this.operationType = OperationKind.COPY;
    }
    beginRangeDownload() {
      this.operationType = OperationKind.DOWNLOAD;
      this.expectedBytes += this.progressDifferentialDownloadInfo.expectedByteCounts[this.index++];
    }
    endRangeDownload() {
      if (this.transferred !== this.progressDifferentialDownloadInfo.grandTotal) {
        this.onProgress({
          total: this.progressDifferentialDownloadInfo.grandTotal,
          delta: this.delta,
          transferred: this.transferred,
          percent: this.transferred / this.progressDifferentialDownloadInfo.grandTotal * 100,
          bytesPerSecond: Math.round(this.transferred / ((Date.now() - this.start) / 1e3))
        });
      }
    }
    // Called when we are 100% done with the connection/download
    _flush(callback) {
      if (this.cancellationToken.cancelled) {
        callback(new Error("cancelled"));
        return;
      }
      this.onProgress({
        total: this.progressDifferentialDownloadInfo.grandTotal,
        delta: this.delta,
        transferred: this.transferred,
        percent: 100,
        bytesPerSecond: Math.round(this.transferred / ((Date.now() - this.start) / 1e3))
      });
      this.delta = 0;
      this.transferred = 0;
      callback(null);
    }
  };
  ProgressDifferentialDownloadCallbackTransform.ProgressDifferentialDownloadCallbackTransform = ProgressDifferentialDownloadCallbackTransform$1;
  return ProgressDifferentialDownloadCallbackTransform;
}
var hasRequiredDifferentialDownloader;
function requireDifferentialDownloader() {
  if (hasRequiredDifferentialDownloader) return DifferentialDownloader;
  hasRequiredDifferentialDownloader = 1;
  Object.defineProperty(DifferentialDownloader, "__esModule", { value: true });
  DifferentialDownloader.DifferentialDownloader = void 0;
  const builder_util_runtime_1 = requireOut();
  const fs_extra_1 = /* @__PURE__ */ requireLib();
  const fs_1 = fs$1;
  const DataSplitter_1 = requireDataSplitter();
  const url_1 = require$$4;
  const downloadPlanBuilder_1 = requireDownloadPlanBuilder();
  const multipleRangeDownloader_1 = requireMultipleRangeDownloader();
  const ProgressDifferentialDownloadCallbackTransform_1 = requireProgressDifferentialDownloadCallbackTransform();
  let DifferentialDownloader$1 = class DifferentialDownloader {
    // noinspection TypeScriptAbstractClassConstructorCanBeMadeProtected
    constructor(blockAwareFileInfo, httpExecutor2, options) {
      this.blockAwareFileInfo = blockAwareFileInfo;
      this.httpExecutor = httpExecutor2;
      this.options = options;
      this.fileMetadataBuffer = null;
      this.logger = options.logger;
    }
    createRequestOptions() {
      const result = {
        headers: {
          ...this.options.requestHeaders,
          accept: "*/*"
        }
      };
      (0, builder_util_runtime_1.configureRequestUrl)(this.options.newUrl, result);
      (0, builder_util_runtime_1.configureRequestOptions)(result);
      return result;
    }
    doDownload(oldBlockMap, newBlockMap) {
      if (oldBlockMap.version !== newBlockMap.version) {
        throw new Error(`version is different (${oldBlockMap.version} - ${newBlockMap.version}), full download is required`);
      }
      const logger = this.logger;
      const operations = (0, downloadPlanBuilder_1.computeOperations)(oldBlockMap, newBlockMap, logger);
      if (logger.debug != null) {
        logger.debug(JSON.stringify(operations, null, 2));
      }
      let downloadSize = 0;
      let copySize = 0;
      for (const operation of operations) {
        const length = operation.end - operation.start;
        if (operation.kind === downloadPlanBuilder_1.OperationKind.DOWNLOAD) {
          downloadSize += length;
        } else {
          copySize += length;
        }
      }
      const newSize = this.blockAwareFileInfo.size;
      if (downloadSize + copySize + (this.fileMetadataBuffer == null ? 0 : this.fileMetadataBuffer.length) !== newSize) {
        throw new Error(`Internal error, size mismatch: downloadSize: ${downloadSize}, copySize: ${copySize}, newSize: ${newSize}`);
      }
      logger.info(`Full: ${formatBytes(newSize)}, To download: ${formatBytes(downloadSize)} (${Math.round(downloadSize / (newSize / 100))}%)`);
      return this.downloadFile(operations);
    }
    downloadFile(tasks) {
      const fdList = [];
      const closeFiles = () => {
        return Promise.all(fdList.map((openedFile) => {
          return (0, fs_extra_1.close)(openedFile.descriptor).catch((e) => {
            this.logger.error(`cannot close file "${openedFile.path}": ${e}`);
          });
        }));
      };
      return this.doDownloadFile(tasks, fdList).then(closeFiles).catch((e) => {
        return closeFiles().catch((closeFilesError) => {
          try {
            this.logger.error(`cannot close files: ${closeFilesError}`);
          } catch (errorOnLog) {
            try {
              console.error(errorOnLog);
            } catch (_ignored) {
            }
          }
          throw e;
        }).then(() => {
          throw e;
        });
      });
    }
    async doDownloadFile(tasks, fdList) {
      const oldFileFd = await (0, fs_extra_1.open)(this.options.oldFile, "r");
      fdList.push({ descriptor: oldFileFd, path: this.options.oldFile });
      const newFileFd = await (0, fs_extra_1.open)(this.options.newFile, "w");
      fdList.push({ descriptor: newFileFd, path: this.options.newFile });
      const fileOut = (0, fs_1.createWriteStream)(this.options.newFile, { fd: newFileFd });
      await new Promise((resolve, reject) => {
        const streams = [];
        let downloadInfoTransform = void 0;
        if (!this.options.isUseMultipleRangeRequest && this.options.onProgress) {
          const expectedByteCounts = [];
          let grandTotalBytes = 0;
          for (const task of tasks) {
            if (task.kind === downloadPlanBuilder_1.OperationKind.DOWNLOAD) {
              expectedByteCounts.push(task.end - task.start);
              grandTotalBytes += task.end - task.start;
            }
          }
          const progressDifferentialDownloadInfo = {
            expectedByteCounts,
            grandTotal: grandTotalBytes
          };
          downloadInfoTransform = new ProgressDifferentialDownloadCallbackTransform_1.ProgressDifferentialDownloadCallbackTransform(progressDifferentialDownloadInfo, this.options.cancellationToken, this.options.onProgress);
          streams.push(downloadInfoTransform);
        }
        const digestTransform = new builder_util_runtime_1.DigestTransform(this.blockAwareFileInfo.sha512);
        digestTransform.isValidateOnEnd = false;
        streams.push(digestTransform);
        fileOut.on("finish", () => {
          fileOut.close(() => {
            fdList.splice(1, 1);
            try {
              digestTransform.validate();
            } catch (e) {
              reject(e);
              return;
            }
            resolve(void 0);
          });
        });
        streams.push(fileOut);
        let lastStream = null;
        for (const stream of streams) {
          stream.on("error", reject);
          if (lastStream == null) {
            lastStream = stream;
          } else {
            lastStream = lastStream.pipe(stream);
          }
        }
        const firstStream = streams[0];
        let w;
        if (this.options.isUseMultipleRangeRequest) {
          w = (0, multipleRangeDownloader_1.executeTasksUsingMultipleRangeRequests)(this, tasks, firstStream, oldFileFd, reject);
          w(0);
          return;
        }
        let downloadOperationCount = 0;
        let actualUrl = null;
        this.logger.info(`Differential download: ${this.options.newUrl}`);
        const requestOptions = this.createRequestOptions();
        requestOptions.redirect = "manual";
        w = (index) => {
          var _a, _b;
          if (index >= tasks.length) {
            if (this.fileMetadataBuffer != null) {
              firstStream.write(this.fileMetadataBuffer);
            }
            firstStream.end();
            return;
          }
          const operation = tasks[index++];
          if (operation.kind === downloadPlanBuilder_1.OperationKind.COPY) {
            if (downloadInfoTransform) {
              downloadInfoTransform.beginFileCopy();
            }
            (0, DataSplitter_1.copyData)(operation, firstStream, oldFileFd, reject, () => w(index));
            return;
          }
          const range2 = `bytes=${operation.start}-${operation.end - 1}`;
          requestOptions.headers.range = range2;
          (_b = (_a = this.logger) === null || _a === void 0 ? void 0 : _a.debug) === null || _b === void 0 ? void 0 : _b.call(_a, `download range: ${range2}`);
          if (downloadInfoTransform) {
            downloadInfoTransform.beginRangeDownload();
          }
          const request = this.httpExecutor.createRequest(requestOptions, (response) => {
            response.on("error", reject);
            response.on("aborted", () => {
              reject(new Error("response has been aborted by the server"));
            });
            if (response.statusCode >= 400) {
              reject((0, builder_util_runtime_1.createHttpError)(response));
            }
            response.pipe(firstStream, {
              end: false
            });
            response.once("end", () => {
              if (downloadInfoTransform) {
                downloadInfoTransform.endRangeDownload();
              }
              if (++downloadOperationCount === 100) {
                downloadOperationCount = 0;
                setTimeout(() => w(index), 1e3);
              } else {
                w(index);
              }
            });
          });
          request.on("redirect", (statusCode, method, redirectUrl) => {
            this.logger.info(`Redirect to ${removeQuery(redirectUrl)}`);
            actualUrl = redirectUrl;
            (0, builder_util_runtime_1.configureRequestUrl)(new url_1.URL(actualUrl), requestOptions);
            request.followRedirect();
          });
          this.httpExecutor.addErrorAndTimeoutHandlers(request, reject);
          request.end();
        };
        w(0);
      });
    }
    async readRemoteBytes(start, endInclusive) {
      const buffer = Buffer.allocUnsafe(endInclusive + 1 - start);
      const requestOptions = this.createRequestOptions();
      requestOptions.headers.range = `bytes=${start}-${endInclusive}`;
      let position = 0;
      await this.request(requestOptions, (chunk) => {
        chunk.copy(buffer, position);
        position += chunk.length;
      });
      if (position !== buffer.length) {
        throw new Error(`Received data length ${position} is not equal to expected ${buffer.length}`);
      }
      return buffer;
    }
    request(requestOptions, dataHandler) {
      return new Promise((resolve, reject) => {
        const request = this.httpExecutor.createRequest(requestOptions, (response) => {
          if (!(0, multipleRangeDownloader_1.checkIsRangesSupported)(response, reject)) {
            return;
          }
          response.on("error", reject);
          response.on("aborted", () => {
            reject(new Error("response has been aborted by the server"));
          });
          response.on("data", dataHandler);
          response.on("end", () => resolve());
        });
        this.httpExecutor.addErrorAndTimeoutHandlers(request, reject);
        request.end();
      });
    }
  };
  DifferentialDownloader.DifferentialDownloader = DifferentialDownloader$1;
  function formatBytes(value, symbol = " KB") {
    return new Intl.NumberFormat("en").format((value / 1024).toFixed(2)) + symbol;
  }
  function removeQuery(url) {
    const index = url.indexOf("?");
    return index < 0 ? url : url.substring(0, index);
  }
  return DifferentialDownloader;
}
var hasRequiredGenericDifferentialDownloader;
function requireGenericDifferentialDownloader() {
  if (hasRequiredGenericDifferentialDownloader) return GenericDifferentialDownloader;
  hasRequiredGenericDifferentialDownloader = 1;
  Object.defineProperty(GenericDifferentialDownloader, "__esModule", { value: true });
  GenericDifferentialDownloader.GenericDifferentialDownloader = void 0;
  const DifferentialDownloader_1 = requireDifferentialDownloader();
  let GenericDifferentialDownloader$1 = class GenericDifferentialDownloader extends DifferentialDownloader_1.DifferentialDownloader {
    download(oldBlockMap, newBlockMap) {
      return this.doDownload(oldBlockMap, newBlockMap);
    }
  };
  GenericDifferentialDownloader.GenericDifferentialDownloader = GenericDifferentialDownloader$1;
  return GenericDifferentialDownloader;
}
var types = {};
var hasRequiredTypes;
function requireTypes() {
  if (hasRequiredTypes) return types;
  hasRequiredTypes = 1;
  (function(exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.UpdaterSignal = exports.UPDATE_DOWNLOADED = exports.DOWNLOAD_PROGRESS = exports.CancellationToken = void 0;
    exports.addHandler = addHandler;
    const builder_util_runtime_1 = requireOut();
    Object.defineProperty(exports, "CancellationToken", { enumerable: true, get: function() {
      return builder_util_runtime_1.CancellationToken;
    } });
    exports.DOWNLOAD_PROGRESS = "download-progress";
    exports.UPDATE_DOWNLOADED = "update-downloaded";
    class UpdaterSignal {
      constructor(emitter) {
        this.emitter = emitter;
      }
      /**
       * Emitted when an authenticating proxy is [asking for user credentials](https://github.com/electron/electron/blob/master/docs/api/client-request.md#event-login).
       */
      login(handler) {
        addHandler(this.emitter, "login", handler);
      }
      progress(handler) {
        addHandler(this.emitter, exports.DOWNLOAD_PROGRESS, handler);
      }
      updateDownloaded(handler) {
        addHandler(this.emitter, exports.UPDATE_DOWNLOADED, handler);
      }
      updateCancelled(handler) {
        addHandler(this.emitter, "update-cancelled", handler);
      }
    }
    exports.UpdaterSignal = UpdaterSignal;
    function addHandler(emitter, event, handler) {
      {
        emitter.on(event, handler);
      }
    }
  })(types);
  return types;
}
var hasRequiredAppUpdater;
function requireAppUpdater() {
  if (hasRequiredAppUpdater) return AppUpdater;
  hasRequiredAppUpdater = 1;
  Object.defineProperty(AppUpdater, "__esModule", { value: true });
  AppUpdater.NoOpLogger = AppUpdater.AppUpdater = void 0;
  const builder_util_runtime_1 = requireOut();
  const crypto_1 = require$$0$3;
  const os_1 = require$$2;
  const events_1 = require$$0$2;
  const fs_extra_1 = /* @__PURE__ */ requireLib();
  const js_yaml_1 = requireJsYaml();
  const lazy_val_1 = requireMain$1();
  const path$1 = path;
  const semver_1 = requireSemver();
  const DownloadedUpdateHelper_1 = requireDownloadedUpdateHelper();
  const ElectronAppAdapter_1 = requireElectronAppAdapter();
  const electronHttpExecutor_1 = requireElectronHttpExecutor();
  const GenericProvider_1 = requireGenericProvider();
  const providerFactory_1 = requireProviderFactory();
  const zlib_1 = require$$14;
  const util_1 = requireUtil();
  const GenericDifferentialDownloader_1 = requireGenericDifferentialDownloader();
  const types_1 = requireTypes();
  let AppUpdater$1 = class AppUpdater2 extends events_1.EventEmitter {
    /**
     * Get the update channel. Doesn't return `channel` from the update configuration, only if was previously set.
     */
    get channel() {
      return this._channel;
    }
    /**
     * Set the update channel. Overrides `channel` in the update configuration.
     *
     * `allowDowngrade` will be automatically set to `true`. If this behavior is not suitable for you, simple set `allowDowngrade` explicitly after.
     */
    set channel(value) {
      if (this._channel != null) {
        if (typeof value !== "string") {
          throw (0, builder_util_runtime_1.newError)(`Channel must be a string, but got: ${value}`, "ERR_UPDATER_INVALID_CHANNEL");
        } else if (value.length === 0) {
          throw (0, builder_util_runtime_1.newError)(`Channel must be not an empty string`, "ERR_UPDATER_INVALID_CHANNEL");
        }
      }
      this._channel = value;
      this.allowDowngrade = true;
    }
    /**
     *  Shortcut for explicitly adding auth tokens to request headers
     */
    addAuthHeader(token) {
      this.requestHeaders = Object.assign({}, this.requestHeaders, {
        authorization: token
      });
    }
    // noinspection JSMethodCanBeStatic,JSUnusedGlobalSymbols
    get netSession() {
      return (0, electronHttpExecutor_1.getNetSession)();
    }
    /**
     * The logger. You can pass [electron-log](https://github.com/megahertz/electron-log), [winston](https://github.com/winstonjs/winston) or another logger with the following interface: `{ info(), warn(), error() }`.
     * Set it to `null` if you would like to disable a logging feature.
     */
    get logger() {
      return this._logger;
    }
    set logger(value) {
      this._logger = value == null ? new NoOpLogger() : value;
    }
    // noinspection JSUnusedGlobalSymbols
    /**
     * test only
     * @private
     */
    set updateConfigPath(value) {
      this.clientPromise = null;
      this._appUpdateConfigPath = value;
      this.configOnDisk = new lazy_val_1.Lazy(() => this.loadUpdateConfig());
    }
    /**
     * Allows developer to override default logic for determining if an update is supported.
     * The default logic compares the `UpdateInfo` minimum system version against the `os.release()` with `semver` package
     */
    get isUpdateSupported() {
      return this._isUpdateSupported;
    }
    set isUpdateSupported(value) {
      if (value) {
        this._isUpdateSupported = value;
      }
    }
    constructor(options, app) {
      super();
      this.autoDownload = true;
      this.autoInstallOnAppQuit = true;
      this.autoRunAppAfterInstall = true;
      this.allowPrerelease = false;
      this.fullChangelog = false;
      this.allowDowngrade = false;
      this.disableWebInstaller = false;
      this.disableDifferentialDownload = false;
      this.forceDevUpdateConfig = false;
      this._channel = null;
      this.downloadedUpdateHelper = null;
      this.requestHeaders = null;
      this._logger = console;
      this.signals = new types_1.UpdaterSignal(this);
      this._appUpdateConfigPath = null;
      this._isUpdateSupported = (updateInfo) => this.checkIfUpdateSupported(updateInfo);
      this.clientPromise = null;
      this.stagingUserIdPromise = new lazy_val_1.Lazy(() => this.getOrCreateStagingUserId());
      this.configOnDisk = new lazy_val_1.Lazy(() => this.loadUpdateConfig());
      this.checkForUpdatesPromise = null;
      this.downloadPromise = null;
      this.updateInfoAndProvider = null;
      this._testOnlyOptions = null;
      this.on("error", (error2) => {
        this._logger.error(`Error: ${error2.stack || error2.message}`);
      });
      if (app == null) {
        this.app = new ElectronAppAdapter_1.ElectronAppAdapter();
        this.httpExecutor = new electronHttpExecutor_1.ElectronHttpExecutor((authInfo, callback) => this.emit("login", authInfo, callback));
      } else {
        this.app = app;
        this.httpExecutor = null;
      }
      const currentVersionString = this.app.version;
      const currentVersion = (0, semver_1.parse)(currentVersionString);
      if (currentVersion == null) {
        throw (0, builder_util_runtime_1.newError)(`App version is not a valid semver version: "${currentVersionString}"`, "ERR_UPDATER_INVALID_VERSION");
      }
      this.currentVersion = currentVersion;
      this.allowPrerelease = hasPrereleaseComponents(currentVersion);
      if (options != null) {
        this.setFeedURL(options);
        if (typeof options !== "string" && options.requestHeaders) {
          this.requestHeaders = options.requestHeaders;
        }
      }
    }
    //noinspection JSMethodCanBeStatic,JSUnusedGlobalSymbols
    getFeedURL() {
      return "Deprecated. Do not use it.";
    }
    /**
     * Configure update provider. If value is `string`, [GenericServerOptions](./publish.md#genericserveroptions) will be set with value as `url`.
     * @param options If you want to override configuration in the `app-update.yml`.
     */
    setFeedURL(options) {
      const runtimeOptions = this.createProviderRuntimeOptions();
      let provider;
      if (typeof options === "string") {
        provider = new GenericProvider_1.GenericProvider({ provider: "generic", url: options }, this, {
          ...runtimeOptions,
          isUseMultipleRangeRequest: (0, providerFactory_1.isUrlProbablySupportMultiRangeRequests)(options)
        });
      } else {
        provider = (0, providerFactory_1.createClient)(options, this, runtimeOptions);
      }
      this.clientPromise = Promise.resolve(provider);
    }
    /**
     * Asks the server whether there is an update.
     * @returns null if the updater is disabled, otherwise info about the latest version
     */
    checkForUpdates() {
      if (!this.isUpdaterActive()) {
        return Promise.resolve(null);
      }
      let checkForUpdatesPromise = this.checkForUpdatesPromise;
      if (checkForUpdatesPromise != null) {
        this._logger.info("Checking for update (already in progress)");
        return checkForUpdatesPromise;
      }
      const nullizePromise = () => this.checkForUpdatesPromise = null;
      this._logger.info("Checking for update");
      checkForUpdatesPromise = this.doCheckForUpdates().then((it) => {
        nullizePromise();
        return it;
      }).catch((e) => {
        nullizePromise();
        this.emit("error", e, `Cannot check for updates: ${(e.stack || e).toString()}`);
        throw e;
      });
      this.checkForUpdatesPromise = checkForUpdatesPromise;
      return checkForUpdatesPromise;
    }
    isUpdaterActive() {
      const isEnabled = this.app.isPackaged || this.forceDevUpdateConfig;
      if (!isEnabled) {
        this._logger.info("Skip checkForUpdates because application is not packed and dev update config is not forced");
        return false;
      }
      return true;
    }
    // noinspection JSUnusedGlobalSymbols
    checkForUpdatesAndNotify(downloadNotification) {
      return this.checkForUpdates().then((it) => {
        if (!(it === null || it === void 0 ? void 0 : it.downloadPromise)) {
          if (this._logger.debug != null) {
            this._logger.debug("checkForUpdatesAndNotify called, downloadPromise is null");
          }
          return it;
        }
        void it.downloadPromise.then(() => {
          const notificationContent = AppUpdater2.formatDownloadNotification(it.updateInfo.version, this.app.name, downloadNotification);
          new require$$1$3.Notification(notificationContent).show();
        });
        return it;
      });
    }
    static formatDownloadNotification(version, appName, downloadNotification) {
      if (downloadNotification == null) {
        downloadNotification = {
          title: "A new update is ready to install",
          body: `{appName} version {version} has been downloaded and will be automatically installed on exit`
        };
      }
      downloadNotification = {
        title: downloadNotification.title.replace("{appName}", appName).replace("{version}", version),
        body: downloadNotification.body.replace("{appName}", appName).replace("{version}", version)
      };
      return downloadNotification;
    }
    async isStagingMatch(updateInfo) {
      const rawStagingPercentage = updateInfo.stagingPercentage;
      let stagingPercentage = rawStagingPercentage;
      if (stagingPercentage == null) {
        return true;
      }
      stagingPercentage = parseInt(stagingPercentage, 10);
      if (isNaN(stagingPercentage)) {
        this._logger.warn(`Staging percentage is NaN: ${rawStagingPercentage}`);
        return true;
      }
      stagingPercentage = stagingPercentage / 100;
      const stagingUserId = await this.stagingUserIdPromise.value;
      const val = builder_util_runtime_1.UUID.parse(stagingUserId).readUInt32BE(12);
      const percentage = val / 4294967295;
      this._logger.info(`Staging percentage: ${stagingPercentage}, percentage: ${percentage}, user id: ${stagingUserId}`);
      return percentage < stagingPercentage;
    }
    computeFinalHeaders(headers) {
      if (this.requestHeaders != null) {
        Object.assign(headers, this.requestHeaders);
      }
      return headers;
    }
    async isUpdateAvailable(updateInfo) {
      const latestVersion = (0, semver_1.parse)(updateInfo.version);
      if (latestVersion == null) {
        throw (0, builder_util_runtime_1.newError)(`This file could not be downloaded, or the latest version (from update server) does not have a valid semver version: "${updateInfo.version}"`, "ERR_UPDATER_INVALID_VERSION");
      }
      const currentVersion = this.currentVersion;
      if ((0, semver_1.eq)(latestVersion, currentVersion)) {
        return false;
      }
      if (!await Promise.resolve(this.isUpdateSupported(updateInfo))) {
        return false;
      }
      const isStagingMatch = await this.isStagingMatch(updateInfo);
      if (!isStagingMatch) {
        return false;
      }
      const isLatestVersionNewer = (0, semver_1.gt)(latestVersion, currentVersion);
      const isLatestVersionOlder = (0, semver_1.lt)(latestVersion, currentVersion);
      if (isLatestVersionNewer) {
        return true;
      }
      return this.allowDowngrade && isLatestVersionOlder;
    }
    checkIfUpdateSupported(updateInfo) {
      const minimumSystemVersion = updateInfo === null || updateInfo === void 0 ? void 0 : updateInfo.minimumSystemVersion;
      const currentOSVersion = (0, os_1.release)();
      if (minimumSystemVersion) {
        try {
          if ((0, semver_1.lt)(currentOSVersion, minimumSystemVersion)) {
            this._logger.info(`Current OS version ${currentOSVersion} is less than the minimum OS version required ${minimumSystemVersion} for version ${currentOSVersion}`);
            return false;
          }
        } catch (e) {
          this._logger.warn(`Failed to compare current OS version(${currentOSVersion}) with minimum OS version(${minimumSystemVersion}): ${(e.message || e).toString()}`);
        }
      }
      return true;
    }
    async getUpdateInfoAndProvider() {
      await this.app.whenReady();
      if (this.clientPromise == null) {
        this.clientPromise = this.configOnDisk.value.then((it) => (0, providerFactory_1.createClient)(it, this, this.createProviderRuntimeOptions()));
      }
      const client = await this.clientPromise;
      const stagingUserId = await this.stagingUserIdPromise.value;
      client.setRequestHeaders(this.computeFinalHeaders({ "x-user-staging-id": stagingUserId }));
      return {
        info: await client.getLatestVersion(),
        provider: client
      };
    }
    createProviderRuntimeOptions() {
      return {
        isUseMultipleRangeRequest: true,
        platform: this._testOnlyOptions == null ? process.platform : this._testOnlyOptions.platform,
        executor: this.httpExecutor
      };
    }
    async doCheckForUpdates() {
      this.emit("checking-for-update");
      const result = await this.getUpdateInfoAndProvider();
      const updateInfo = result.info;
      if (!await this.isUpdateAvailable(updateInfo)) {
        this._logger.info(`Update for version ${this.currentVersion.format()} is not available (latest version: ${updateInfo.version}, downgrade is ${this.allowDowngrade ? "allowed" : "disallowed"}).`);
        this.emit("update-not-available", updateInfo);
        return {
          isUpdateAvailable: false,
          versionInfo: updateInfo,
          updateInfo
        };
      }
      this.updateInfoAndProvider = result;
      this.onUpdateAvailable(updateInfo);
      const cancellationToken = new builder_util_runtime_1.CancellationToken();
      return {
        isUpdateAvailable: true,
        versionInfo: updateInfo,
        updateInfo,
        cancellationToken,
        downloadPromise: this.autoDownload ? this.downloadUpdate(cancellationToken) : null
      };
    }
    onUpdateAvailable(updateInfo) {
      this._logger.info(`Found version ${updateInfo.version} (url: ${(0, builder_util_runtime_1.asArray)(updateInfo.files).map((it) => it.url).join(", ")})`);
      this.emit("update-available", updateInfo);
    }
    /**
     * Start downloading update manually. You can use this method if `autoDownload` option is set to `false`.
     * @returns {Promise<Array<string>>} Paths to downloaded files.
     */
    downloadUpdate(cancellationToken = new builder_util_runtime_1.CancellationToken()) {
      const updateInfoAndProvider = this.updateInfoAndProvider;
      if (updateInfoAndProvider == null) {
        const error2 = new Error("Please check update first");
        this.dispatchError(error2);
        return Promise.reject(error2);
      }
      if (this.downloadPromise != null) {
        this._logger.info("Downloading update (already in progress)");
        return this.downloadPromise;
      }
      this._logger.info(`Downloading update from ${(0, builder_util_runtime_1.asArray)(updateInfoAndProvider.info.files).map((it) => it.url).join(", ")}`);
      const errorHandler = (e) => {
        if (!(e instanceof builder_util_runtime_1.CancellationError)) {
          try {
            this.dispatchError(e);
          } catch (nestedError) {
            this._logger.warn(`Cannot dispatch error event: ${nestedError.stack || nestedError}`);
          }
        }
        return e;
      };
      this.downloadPromise = this.doDownloadUpdate({
        updateInfoAndProvider,
        requestHeaders: this.computeRequestHeaders(updateInfoAndProvider.provider),
        cancellationToken,
        disableWebInstaller: this.disableWebInstaller,
        disableDifferentialDownload: this.disableDifferentialDownload
      }).catch((e) => {
        throw errorHandler(e);
      }).finally(() => {
        this.downloadPromise = null;
      });
      return this.downloadPromise;
    }
    dispatchError(e) {
      this.emit("error", e, (e.stack || e).toString());
    }
    dispatchUpdateDownloaded(event) {
      this.emit(types_1.UPDATE_DOWNLOADED, event);
    }
    async loadUpdateConfig() {
      if (this._appUpdateConfigPath == null) {
        this._appUpdateConfigPath = this.app.appUpdateConfigPath;
      }
      return (0, js_yaml_1.load)(await (0, fs_extra_1.readFile)(this._appUpdateConfigPath, "utf-8"));
    }
    computeRequestHeaders(provider) {
      const fileExtraDownloadHeaders = provider.fileExtraDownloadHeaders;
      if (fileExtraDownloadHeaders != null) {
        const requestHeaders = this.requestHeaders;
        return requestHeaders == null ? fileExtraDownloadHeaders : {
          ...fileExtraDownloadHeaders,
          ...requestHeaders
        };
      }
      return this.computeFinalHeaders({ accept: "*/*" });
    }
    async getOrCreateStagingUserId() {
      const file2 = path$1.join(this.app.userDataPath, ".updaterId");
      try {
        const id2 = await (0, fs_extra_1.readFile)(file2, "utf-8");
        if (builder_util_runtime_1.UUID.check(id2)) {
          return id2;
        } else {
          this._logger.warn(`Staging user id file exists, but content was invalid: ${id2}`);
        }
      } catch (e) {
        if (e.code !== "ENOENT") {
          this._logger.warn(`Couldn't read staging user ID, creating a blank one: ${e}`);
        }
      }
      const id = builder_util_runtime_1.UUID.v5((0, crypto_1.randomBytes)(4096), builder_util_runtime_1.UUID.OID);
      this._logger.info(`Generated new staging user ID: ${id}`);
      try {
        await (0, fs_extra_1.outputFile)(file2, id);
      } catch (e) {
        this._logger.warn(`Couldn't write out staging user ID: ${e}`);
      }
      return id;
    }
    /** @internal */
    get isAddNoCacheQuery() {
      const headers = this.requestHeaders;
      if (headers == null) {
        return true;
      }
      for (const headerName of Object.keys(headers)) {
        const s = headerName.toLowerCase();
        if (s === "authorization" || s === "private-token") {
          return false;
        }
      }
      return true;
    }
    async getOrCreateDownloadHelper() {
      let result = this.downloadedUpdateHelper;
      if (result == null) {
        const dirName = (await this.configOnDisk.value).updaterCacheDirName;
        const logger = this._logger;
        if (dirName == null) {
          logger.error("updaterCacheDirName is not specified in app-update.yml Was app build using at least electron-builder 20.34.0?");
        }
        const cacheDir = path$1.join(this.app.baseCachePath, dirName || this.app.name);
        if (logger.debug != null) {
          logger.debug(`updater cache dir: ${cacheDir}`);
        }
        result = new DownloadedUpdateHelper_1.DownloadedUpdateHelper(cacheDir);
        this.downloadedUpdateHelper = result;
      }
      return result;
    }
    async executeDownload(taskOptions) {
      const fileInfo = taskOptions.fileInfo;
      const downloadOptions = {
        headers: taskOptions.downloadUpdateOptions.requestHeaders,
        cancellationToken: taskOptions.downloadUpdateOptions.cancellationToken,
        sha2: fileInfo.info.sha2,
        sha512: fileInfo.info.sha512
      };
      if (this.listenerCount(types_1.DOWNLOAD_PROGRESS) > 0) {
        downloadOptions.onProgress = (it) => this.emit(types_1.DOWNLOAD_PROGRESS, it);
      }
      const updateInfo = taskOptions.downloadUpdateOptions.updateInfoAndProvider.info;
      const version = updateInfo.version;
      const packageInfo = fileInfo.packageInfo;
      function getCacheUpdateFileName() {
        const urlPath = decodeURIComponent(taskOptions.fileInfo.url.pathname);
        if (urlPath.endsWith(`.${taskOptions.fileExtension}`)) {
          return path$1.basename(urlPath);
        } else {
          return taskOptions.fileInfo.info.url;
        }
      }
      const downloadedUpdateHelper = await this.getOrCreateDownloadHelper();
      const cacheDir = downloadedUpdateHelper.cacheDirForPendingUpdate;
      await (0, fs_extra_1.mkdir)(cacheDir, { recursive: true });
      const updateFileName = getCacheUpdateFileName();
      let updateFile = path$1.join(cacheDir, updateFileName);
      const packageFile = packageInfo == null ? null : path$1.join(cacheDir, `package-${version}${path$1.extname(packageInfo.path) || ".7z"}`);
      const done = async (isSaveCache) => {
        await downloadedUpdateHelper.setDownloadedFile(updateFile, packageFile, updateInfo, fileInfo, updateFileName, isSaveCache);
        await taskOptions.done({
          ...updateInfo,
          downloadedFile: updateFile
        });
        return packageFile == null ? [updateFile] : [updateFile, packageFile];
      };
      const log = this._logger;
      const cachedUpdateFile = await downloadedUpdateHelper.validateDownloadedPath(updateFile, updateInfo, fileInfo, log);
      if (cachedUpdateFile != null) {
        updateFile = cachedUpdateFile;
        return await done(false);
      }
      const removeFileIfAny = async () => {
        await downloadedUpdateHelper.clear().catch(() => {
        });
        return await (0, fs_extra_1.unlink)(updateFile).catch(() => {
        });
      };
      const tempUpdateFile = await (0, DownloadedUpdateHelper_1.createTempUpdateFile)(`temp-${updateFileName}`, cacheDir, log);
      try {
        await taskOptions.task(tempUpdateFile, downloadOptions, packageFile, removeFileIfAny);
        await (0, builder_util_runtime_1.retry)(() => (0, fs_extra_1.rename)(tempUpdateFile, updateFile), 60, 500, 0, 0, (error2) => error2 instanceof Error && /^EBUSY:/.test(error2.message));
      } catch (e) {
        await removeFileIfAny();
        if (e instanceof builder_util_runtime_1.CancellationError) {
          log.info("cancelled");
          this.emit("update-cancelled", updateInfo);
        }
        throw e;
      }
      log.info(`New version ${version} has been downloaded to ${updateFile}`);
      return await done(true);
    }
    async differentialDownloadInstaller(fileInfo, downloadUpdateOptions, installerPath, provider, oldInstallerFileName) {
      try {
        if (this._testOnlyOptions != null && !this._testOnlyOptions.isUseDifferentialDownload) {
          return true;
        }
        const blockmapFileUrls = (0, util_1.blockmapFiles)(fileInfo.url, this.app.version, downloadUpdateOptions.updateInfoAndProvider.info.version);
        this._logger.info(`Download block maps (old: "${blockmapFileUrls[0]}", new: ${blockmapFileUrls[1]})`);
        const downloadBlockMap = async (url) => {
          const data = await this.httpExecutor.downloadToBuffer(url, {
            headers: downloadUpdateOptions.requestHeaders,
            cancellationToken: downloadUpdateOptions.cancellationToken
          });
          if (data == null || data.length === 0) {
            throw new Error(`Blockmap "${url.href}" is empty`);
          }
          try {
            return JSON.parse((0, zlib_1.gunzipSync)(data).toString());
          } catch (e) {
            throw new Error(`Cannot parse blockmap "${url.href}", error: ${e}`);
          }
        };
        const downloadOptions = {
          newUrl: fileInfo.url,
          oldFile: path$1.join(this.downloadedUpdateHelper.cacheDir, oldInstallerFileName),
          logger: this._logger,
          newFile: installerPath,
          isUseMultipleRangeRequest: provider.isUseMultipleRangeRequest,
          requestHeaders: downloadUpdateOptions.requestHeaders,
          cancellationToken: downloadUpdateOptions.cancellationToken
        };
        if (this.listenerCount(types_1.DOWNLOAD_PROGRESS) > 0) {
          downloadOptions.onProgress = (it) => this.emit(types_1.DOWNLOAD_PROGRESS, it);
        }
        const blockMapDataList = await Promise.all(blockmapFileUrls.map((u) => downloadBlockMap(u)));
        await new GenericDifferentialDownloader_1.GenericDifferentialDownloader(fileInfo.info, this.httpExecutor, downloadOptions).download(blockMapDataList[0], blockMapDataList[1]);
        return false;
      } catch (e) {
        this._logger.error(`Cannot download differentially, fallback to full download: ${e.stack || e}`);
        if (this._testOnlyOptions != null) {
          throw e;
        }
        return true;
      }
    }
  };
  AppUpdater.AppUpdater = AppUpdater$1;
  function hasPrereleaseComponents(version) {
    const versionPrereleaseComponent = (0, semver_1.prerelease)(version);
    return versionPrereleaseComponent != null && versionPrereleaseComponent.length > 0;
  }
  class NoOpLogger {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    info(message) {
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    warn(message) {
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    error(message) {
    }
  }
  AppUpdater.NoOpLogger = NoOpLogger;
  return AppUpdater;
}
var hasRequiredBaseUpdater;
function requireBaseUpdater() {
  if (hasRequiredBaseUpdater) return BaseUpdater;
  hasRequiredBaseUpdater = 1;
  Object.defineProperty(BaseUpdater, "__esModule", { value: true });
  BaseUpdater.BaseUpdater = void 0;
  const child_process_1 = require$$0$4;
  const AppUpdater_1 = requireAppUpdater();
  let BaseUpdater$1 = class BaseUpdater extends AppUpdater_1.AppUpdater {
    constructor(options, app) {
      super(options, app);
      this.quitAndInstallCalled = false;
      this.quitHandlerAdded = false;
    }
    quitAndInstall(isSilent = false, isForceRunAfter = false) {
      this._logger.info(`Install on explicit quitAndInstall`);
      const isInstalled = this.install(isSilent, isSilent ? isForceRunAfter : this.autoRunAppAfterInstall);
      if (isInstalled) {
        setImmediate(() => {
          require$$1$3.autoUpdater.emit("before-quit-for-update");
          this.app.quit();
        });
      } else {
        this.quitAndInstallCalled = false;
      }
    }
    executeDownload(taskOptions) {
      return super.executeDownload({
        ...taskOptions,
        done: (event) => {
          this.dispatchUpdateDownloaded(event);
          this.addQuitHandler();
          return Promise.resolve();
        }
      });
    }
    get installerPath() {
      return this.downloadedUpdateHelper == null ? null : this.downloadedUpdateHelper.file;
    }
    // must be sync (because quit even handler is not async)
    install(isSilent = false, isForceRunAfter = false) {
      if (this.quitAndInstallCalled) {
        this._logger.warn("install call ignored: quitAndInstallCalled is set to true");
        return false;
      }
      const downloadedUpdateHelper = this.downloadedUpdateHelper;
      const installerPath = this.installerPath;
      const downloadedFileInfo = downloadedUpdateHelper == null ? null : downloadedUpdateHelper.downloadedFileInfo;
      if (installerPath == null || downloadedFileInfo == null) {
        this.dispatchError(new Error("No valid update available, can't quit and install"));
        return false;
      }
      this.quitAndInstallCalled = true;
      try {
        this._logger.info(`Install: isSilent: ${isSilent}, isForceRunAfter: ${isForceRunAfter}`);
        return this.doInstall({
          isSilent,
          isForceRunAfter,
          isAdminRightsRequired: downloadedFileInfo.isAdminRightsRequired
        });
      } catch (e) {
        this.dispatchError(e);
        return false;
      }
    }
    addQuitHandler() {
      if (this.quitHandlerAdded || !this.autoInstallOnAppQuit) {
        return;
      }
      this.quitHandlerAdded = true;
      this.app.onQuit((exitCode) => {
        if (this.quitAndInstallCalled) {
          this._logger.info("Update installer has already been triggered. Quitting application.");
          return;
        }
        if (!this.autoInstallOnAppQuit) {
          this._logger.info("Update will not be installed on quit because autoInstallOnAppQuit is set to false.");
          return;
        }
        if (exitCode !== 0) {
          this._logger.info(`Update will be not installed on quit because application is quitting with exit code ${exitCode}`);
          return;
        }
        this._logger.info("Auto install update on quit");
        this.install(true, false);
      });
    }
    wrapSudo() {
      const { name } = this.app;
      const installComment = `"${name} would like to update"`;
      const sudo = this.spawnSyncLog("which gksudo || which kdesudo || which pkexec || which beesu");
      const command = [sudo];
      if (/kdesudo/i.test(sudo)) {
        command.push("--comment", installComment);
        command.push("-c");
      } else if (/gksudo/i.test(sudo)) {
        command.push("--message", installComment);
      } else if (/pkexec/i.test(sudo)) {
        command.push("--disable-internal-agent");
      }
      return command.join(" ");
    }
    spawnSyncLog(cmd, args = [], env = {}) {
      this._logger.info(`Executing: ${cmd} with args: ${args}`);
      const response = (0, child_process_1.spawnSync)(cmd, args, {
        env: { ...process.env, ...env },
        encoding: "utf-8",
        shell: true
      });
      const { error: error2, status, stdout, stderr } = response;
      if (error2 != null) {
        this._logger.error(stderr);
        throw error2;
      } else if (status != null && status !== 0) {
        this._logger.error(stderr);
        throw new Error(`Command ${cmd} exited with code ${status}`);
      }
      return stdout.trim();
    }
    /**
     * This handles both node 8 and node 10 way of emitting error when spawning a process
     *   - node 8: Throws the error
     *   - node 10: Emit the error(Need to listen with on)
     */
    // https://github.com/electron-userland/electron-builder/issues/1129
    // Node 8 sends errors: https://nodejs.org/dist/latest-v8.x/docs/api/errors.html#errors_common_system_errors
    async spawnLog(cmd, args = [], env = void 0, stdio = "ignore") {
      this._logger.info(`Executing: ${cmd} with args: ${args}`);
      return new Promise((resolve, reject) => {
        try {
          const params = { stdio, env, detached: true };
          const p = (0, child_process_1.spawn)(cmd, args, params);
          p.on("error", (error2) => {
            reject(error2);
          });
          p.unref();
          if (p.pid !== void 0) {
            resolve(true);
          }
        } catch (error2) {
          reject(error2);
        }
      });
    }
  };
  BaseUpdater.BaseUpdater = BaseUpdater$1;
  return BaseUpdater;
}
var AppImageUpdater = {};
var FileWithEmbeddedBlockMapDifferentialDownloader = {};
var hasRequiredFileWithEmbeddedBlockMapDifferentialDownloader;
function requireFileWithEmbeddedBlockMapDifferentialDownloader() {
  if (hasRequiredFileWithEmbeddedBlockMapDifferentialDownloader) return FileWithEmbeddedBlockMapDifferentialDownloader;
  hasRequiredFileWithEmbeddedBlockMapDifferentialDownloader = 1;
  Object.defineProperty(FileWithEmbeddedBlockMapDifferentialDownloader, "__esModule", { value: true });
  FileWithEmbeddedBlockMapDifferentialDownloader.FileWithEmbeddedBlockMapDifferentialDownloader = void 0;
  const fs_extra_1 = /* @__PURE__ */ requireLib();
  const DifferentialDownloader_1 = requireDifferentialDownloader();
  const zlib_1 = require$$14;
  let FileWithEmbeddedBlockMapDifferentialDownloader$1 = class FileWithEmbeddedBlockMapDifferentialDownloader extends DifferentialDownloader_1.DifferentialDownloader {
    async download() {
      const packageInfo = this.blockAwareFileInfo;
      const fileSize = packageInfo.size;
      const offset = fileSize - (packageInfo.blockMapSize + 4);
      this.fileMetadataBuffer = await this.readRemoteBytes(offset, fileSize - 1);
      const newBlockMap = readBlockMap(this.fileMetadataBuffer.slice(0, this.fileMetadataBuffer.length - 4));
      await this.doDownload(await readEmbeddedBlockMapData(this.options.oldFile), newBlockMap);
    }
  };
  FileWithEmbeddedBlockMapDifferentialDownloader.FileWithEmbeddedBlockMapDifferentialDownloader = FileWithEmbeddedBlockMapDifferentialDownloader$1;
  function readBlockMap(data) {
    return JSON.parse((0, zlib_1.inflateRawSync)(data).toString());
  }
  async function readEmbeddedBlockMapData(file2) {
    const fd = await (0, fs_extra_1.open)(file2, "r");
    try {
      const fileSize = (await (0, fs_extra_1.fstat)(fd)).size;
      const sizeBuffer = Buffer.allocUnsafe(4);
      await (0, fs_extra_1.read)(fd, sizeBuffer, 0, sizeBuffer.length, fileSize - sizeBuffer.length);
      const dataBuffer = Buffer.allocUnsafe(sizeBuffer.readUInt32BE(0));
      await (0, fs_extra_1.read)(fd, dataBuffer, 0, dataBuffer.length, fileSize - sizeBuffer.length - dataBuffer.length);
      await (0, fs_extra_1.close)(fd);
      return readBlockMap(dataBuffer);
    } catch (e) {
      await (0, fs_extra_1.close)(fd);
      throw e;
    }
  }
  return FileWithEmbeddedBlockMapDifferentialDownloader;
}
var hasRequiredAppImageUpdater;
function requireAppImageUpdater() {
  if (hasRequiredAppImageUpdater) return AppImageUpdater;
  hasRequiredAppImageUpdater = 1;
  Object.defineProperty(AppImageUpdater, "__esModule", { value: true });
  AppImageUpdater.AppImageUpdater = void 0;
  const builder_util_runtime_1 = requireOut();
  const child_process_1 = require$$0$4;
  const fs_extra_1 = /* @__PURE__ */ requireLib();
  const fs_1 = fs$1;
  const path$1 = path;
  const BaseUpdater_1 = requireBaseUpdater();
  const FileWithEmbeddedBlockMapDifferentialDownloader_1 = requireFileWithEmbeddedBlockMapDifferentialDownloader();
  const Provider_1 = requireProvider();
  const types_1 = requireTypes();
  let AppImageUpdater$1 = class AppImageUpdater extends BaseUpdater_1.BaseUpdater {
    constructor(options, app) {
      super(options, app);
    }
    isUpdaterActive() {
      if (process.env["APPIMAGE"] == null) {
        if (process.env["SNAP"] == null) {
          this._logger.warn("APPIMAGE env is not defined, current application is not an AppImage");
        } else {
          this._logger.info("SNAP env is defined, updater is disabled");
        }
        return false;
      }
      return super.isUpdaterActive();
    }
    /*** @private */
    doDownloadUpdate(downloadUpdateOptions) {
      const provider = downloadUpdateOptions.updateInfoAndProvider.provider;
      const fileInfo = (0, Provider_1.findFile)(provider.resolveFiles(downloadUpdateOptions.updateInfoAndProvider.info), "AppImage", ["rpm", "deb", "pacman"]);
      return this.executeDownload({
        fileExtension: "AppImage",
        fileInfo,
        downloadUpdateOptions,
        task: async (updateFile, downloadOptions) => {
          const oldFile = process.env["APPIMAGE"];
          if (oldFile == null) {
            throw (0, builder_util_runtime_1.newError)("APPIMAGE env is not defined", "ERR_UPDATER_OLD_FILE_NOT_FOUND");
          }
          if (downloadUpdateOptions.disableDifferentialDownload || await this.downloadDifferential(fileInfo, oldFile, updateFile, provider, downloadUpdateOptions)) {
            await this.httpExecutor.download(fileInfo.url, updateFile, downloadOptions);
          }
          await (0, fs_extra_1.chmod)(updateFile, 493);
        }
      });
    }
    async downloadDifferential(fileInfo, oldFile, updateFile, provider, downloadUpdateOptions) {
      try {
        const downloadOptions = {
          newUrl: fileInfo.url,
          oldFile,
          logger: this._logger,
          newFile: updateFile,
          isUseMultipleRangeRequest: provider.isUseMultipleRangeRequest,
          requestHeaders: downloadUpdateOptions.requestHeaders,
          cancellationToken: downloadUpdateOptions.cancellationToken
        };
        if (this.listenerCount(types_1.DOWNLOAD_PROGRESS) > 0) {
          downloadOptions.onProgress = (it) => this.emit(types_1.DOWNLOAD_PROGRESS, it);
        }
        await new FileWithEmbeddedBlockMapDifferentialDownloader_1.FileWithEmbeddedBlockMapDifferentialDownloader(fileInfo.info, this.httpExecutor, downloadOptions).download();
        return false;
      } catch (e) {
        this._logger.error(`Cannot download differentially, fallback to full download: ${e.stack || e}`);
        return process.platform === "linux";
      }
    }
    doInstall(options) {
      const appImageFile = process.env["APPIMAGE"];
      if (appImageFile == null) {
        throw (0, builder_util_runtime_1.newError)("APPIMAGE env is not defined", "ERR_UPDATER_OLD_FILE_NOT_FOUND");
      }
      (0, fs_1.unlinkSync)(appImageFile);
      let destination;
      const existingBaseName = path$1.basename(appImageFile);
      const installerPath = this.installerPath;
      if (installerPath == null) {
        this.dispatchError(new Error("No valid update available, can't quit and install"));
        return false;
      }
      if (path$1.basename(installerPath) === existingBaseName || !/\d+\.\d+\.\d+/.test(existingBaseName)) {
        destination = appImageFile;
      } else {
        destination = path$1.join(path$1.dirname(appImageFile), path$1.basename(installerPath));
      }
      (0, child_process_1.execFileSync)("mv", ["-f", installerPath, destination]);
      if (destination !== appImageFile) {
        this.emit("appimage-filename-updated", destination);
      }
      const env = {
        ...process.env,
        APPIMAGE_SILENT_INSTALL: "true"
      };
      if (options.isForceRunAfter) {
        this.spawnLog(destination, [], env);
      } else {
        env.APPIMAGE_EXIT_AFTER_INSTALL = "true";
        (0, child_process_1.execFileSync)(destination, [], { env });
      }
      return true;
    }
  };
  AppImageUpdater.AppImageUpdater = AppImageUpdater$1;
  return AppImageUpdater;
}
var DebUpdater = {};
var hasRequiredDebUpdater;
function requireDebUpdater() {
  if (hasRequiredDebUpdater) return DebUpdater;
  hasRequiredDebUpdater = 1;
  Object.defineProperty(DebUpdater, "__esModule", { value: true });
  DebUpdater.DebUpdater = void 0;
  const BaseUpdater_1 = requireBaseUpdater();
  const Provider_1 = requireProvider();
  const types_1 = requireTypes();
  let DebUpdater$1 = class DebUpdater extends BaseUpdater_1.BaseUpdater {
    constructor(options, app) {
      super(options, app);
    }
    /*** @private */
    doDownloadUpdate(downloadUpdateOptions) {
      const provider = downloadUpdateOptions.updateInfoAndProvider.provider;
      const fileInfo = (0, Provider_1.findFile)(provider.resolveFiles(downloadUpdateOptions.updateInfoAndProvider.info), "deb", ["AppImage", "rpm", "pacman"]);
      return this.executeDownload({
        fileExtension: "deb",
        fileInfo,
        downloadUpdateOptions,
        task: async (updateFile, downloadOptions) => {
          if (this.listenerCount(types_1.DOWNLOAD_PROGRESS) > 0) {
            downloadOptions.onProgress = (it) => this.emit(types_1.DOWNLOAD_PROGRESS, it);
          }
          await this.httpExecutor.download(fileInfo.url, updateFile, downloadOptions);
        }
      });
    }
    get installerPath() {
      var _a, _b;
      return (_b = (_a = super.installerPath) === null || _a === void 0 ? void 0 : _a.replace(/ /g, "\\ ")) !== null && _b !== void 0 ? _b : null;
    }
    doInstall(options) {
      const sudo = this.wrapSudo();
      const wrapper = /pkexec/i.test(sudo) ? "" : `"`;
      const installerPath = this.installerPath;
      if (installerPath == null) {
        this.dispatchError(new Error("No valid update available, can't quit and install"));
        return false;
      }
      const cmd = ["dpkg", "-i", installerPath, "||", "apt-get", "install", "-f", "-y"];
      this.spawnSyncLog(sudo, [`${wrapper}/bin/bash`, "-c", `'${cmd.join(" ")}'${wrapper}`]);
      if (options.isForceRunAfter) {
        this.app.relaunch();
      }
      return true;
    }
  };
  DebUpdater.DebUpdater = DebUpdater$1;
  return DebUpdater;
}
var PacmanUpdater = {};
var hasRequiredPacmanUpdater;
function requirePacmanUpdater() {
  if (hasRequiredPacmanUpdater) return PacmanUpdater;
  hasRequiredPacmanUpdater = 1;
  Object.defineProperty(PacmanUpdater, "__esModule", { value: true });
  PacmanUpdater.PacmanUpdater = void 0;
  const BaseUpdater_1 = requireBaseUpdater();
  const types_1 = requireTypes();
  const Provider_1 = requireProvider();
  let PacmanUpdater$1 = class PacmanUpdater extends BaseUpdater_1.BaseUpdater {
    constructor(options, app) {
      super(options, app);
    }
    /*** @private */
    doDownloadUpdate(downloadUpdateOptions) {
      const provider = downloadUpdateOptions.updateInfoAndProvider.provider;
      const fileInfo = (0, Provider_1.findFile)(provider.resolveFiles(downloadUpdateOptions.updateInfoAndProvider.info), "pacman", ["AppImage", "deb", "rpm"]);
      return this.executeDownload({
        fileExtension: "pacman",
        fileInfo,
        downloadUpdateOptions,
        task: async (updateFile, downloadOptions) => {
          if (this.listenerCount(types_1.DOWNLOAD_PROGRESS) > 0) {
            downloadOptions.onProgress = (it) => this.emit(types_1.DOWNLOAD_PROGRESS, it);
          }
          await this.httpExecutor.download(fileInfo.url, updateFile, downloadOptions);
        }
      });
    }
    get installerPath() {
      var _a, _b;
      return (_b = (_a = super.installerPath) === null || _a === void 0 ? void 0 : _a.replace(/ /g, "\\ ")) !== null && _b !== void 0 ? _b : null;
    }
    doInstall(options) {
      const sudo = this.wrapSudo();
      const wrapper = /pkexec/i.test(sudo) ? "" : `"`;
      const installerPath = this.installerPath;
      if (installerPath == null) {
        this.dispatchError(new Error("No valid update available, can't quit and install"));
        return false;
      }
      const cmd = ["pacman", "-U", "--noconfirm", installerPath];
      this.spawnSyncLog(sudo, [`${wrapper}/bin/bash`, "-c", `'${cmd.join(" ")}'${wrapper}`]);
      if (options.isForceRunAfter) {
        this.app.relaunch();
      }
      return true;
    }
  };
  PacmanUpdater.PacmanUpdater = PacmanUpdater$1;
  return PacmanUpdater;
}
var RpmUpdater = {};
var hasRequiredRpmUpdater;
function requireRpmUpdater() {
  if (hasRequiredRpmUpdater) return RpmUpdater;
  hasRequiredRpmUpdater = 1;
  Object.defineProperty(RpmUpdater, "__esModule", { value: true });
  RpmUpdater.RpmUpdater = void 0;
  const BaseUpdater_1 = requireBaseUpdater();
  const types_1 = requireTypes();
  const Provider_1 = requireProvider();
  let RpmUpdater$1 = class RpmUpdater extends BaseUpdater_1.BaseUpdater {
    constructor(options, app) {
      super(options, app);
    }
    /*** @private */
    doDownloadUpdate(downloadUpdateOptions) {
      const provider = downloadUpdateOptions.updateInfoAndProvider.provider;
      const fileInfo = (0, Provider_1.findFile)(provider.resolveFiles(downloadUpdateOptions.updateInfoAndProvider.info), "rpm", ["AppImage", "deb", "pacman"]);
      return this.executeDownload({
        fileExtension: "rpm",
        fileInfo,
        downloadUpdateOptions,
        task: async (updateFile, downloadOptions) => {
          if (this.listenerCount(types_1.DOWNLOAD_PROGRESS) > 0) {
            downloadOptions.onProgress = (it) => this.emit(types_1.DOWNLOAD_PROGRESS, it);
          }
          await this.httpExecutor.download(fileInfo.url, updateFile, downloadOptions);
        }
      });
    }
    get installerPath() {
      var _a, _b;
      return (_b = (_a = super.installerPath) === null || _a === void 0 ? void 0 : _a.replace(/ /g, "\\ ")) !== null && _b !== void 0 ? _b : null;
    }
    doInstall(options) {
      const sudo = this.wrapSudo();
      const wrapper = /pkexec/i.test(sudo) ? "" : `"`;
      const packageManager = this.spawnSyncLog("which zypper");
      const installerPath = this.installerPath;
      if (installerPath == null) {
        this.dispatchError(new Error("No valid update available, can't quit and install"));
        return false;
      }
      let cmd;
      if (!packageManager) {
        const packageManager2 = this.spawnSyncLog("which dnf || which yum");
        cmd = [packageManager2, "-y", "install", installerPath];
      } else {
        cmd = [packageManager, "--no-refresh", "install", "--allow-unsigned-rpm", "-y", "-f", installerPath];
      }
      this.spawnSyncLog(sudo, [`${wrapper}/bin/bash`, "-c", `'${cmd.join(" ")}'${wrapper}`]);
      if (options.isForceRunAfter) {
        this.app.relaunch();
      }
      return true;
    }
  };
  RpmUpdater.RpmUpdater = RpmUpdater$1;
  return RpmUpdater;
}
var MacUpdater = {};
var hasRequiredMacUpdater;
function requireMacUpdater() {
  if (hasRequiredMacUpdater) return MacUpdater;
  hasRequiredMacUpdater = 1;
  Object.defineProperty(MacUpdater, "__esModule", { value: true });
  MacUpdater.MacUpdater = void 0;
  const builder_util_runtime_1 = requireOut();
  const fs_extra_1 = /* @__PURE__ */ requireLib();
  const fs_1 = fs$1;
  const path$1 = path;
  const http_1 = require$$4$1;
  const AppUpdater_1 = requireAppUpdater();
  const Provider_1 = requireProvider();
  const child_process_1 = require$$0$4;
  const crypto_1 = require$$0$3;
  let MacUpdater$1 = class MacUpdater extends AppUpdater_1.AppUpdater {
    constructor(options, app) {
      super(options, app);
      this.nativeUpdater = require$$1$3.autoUpdater;
      this.squirrelDownloadedUpdate = false;
      this.nativeUpdater.on("error", (it) => {
        this._logger.warn(it);
        this.emit("error", it);
      });
      this.nativeUpdater.on("update-downloaded", () => {
        this.squirrelDownloadedUpdate = true;
        this.debug("nativeUpdater.update-downloaded");
      });
    }
    debug(message) {
      if (this._logger.debug != null) {
        this._logger.debug(message);
      }
    }
    closeServerIfExists() {
      if (this.server) {
        this.debug("Closing proxy server");
        this.server.close((err) => {
          if (err) {
            this.debug("proxy server wasn't already open, probably attempted closing again as a safety check before quit");
          }
        });
      }
    }
    async doDownloadUpdate(downloadUpdateOptions) {
      let files = downloadUpdateOptions.updateInfoAndProvider.provider.resolveFiles(downloadUpdateOptions.updateInfoAndProvider.info);
      const log = this._logger;
      const sysctlRosettaInfoKey = "sysctl.proc_translated";
      let isRosetta = false;
      try {
        this.debug("Checking for macOS Rosetta environment");
        const result = (0, child_process_1.execFileSync)("sysctl", [sysctlRosettaInfoKey], { encoding: "utf8" });
        isRosetta = result.includes(`${sysctlRosettaInfoKey}: 1`);
        log.info(`Checked for macOS Rosetta environment (isRosetta=${isRosetta})`);
      } catch (e) {
        log.warn(`sysctl shell command to check for macOS Rosetta environment failed: ${e}`);
      }
      let isArm64Mac = false;
      try {
        this.debug("Checking for arm64 in uname");
        const result = (0, child_process_1.execFileSync)("uname", ["-a"], { encoding: "utf8" });
        const isArm = result.includes("ARM");
        log.info(`Checked 'uname -a': arm64=${isArm}`);
        isArm64Mac = isArm64Mac || isArm;
      } catch (e) {
        log.warn(`uname shell command to check for arm64 failed: ${e}`);
      }
      isArm64Mac = isArm64Mac || process.arch === "arm64" || isRosetta;
      const isArm64 = (file2) => {
        var _a;
        return file2.url.pathname.includes("arm64") || ((_a = file2.info.url) === null || _a === void 0 ? void 0 : _a.includes("arm64"));
      };
      if (isArm64Mac && files.some(isArm64)) {
        files = files.filter((file2) => isArm64Mac === isArm64(file2));
      } else {
        files = files.filter((file2) => !isArm64(file2));
      }
      const zipFileInfo = (0, Provider_1.findFile)(files, "zip", ["pkg", "dmg"]);
      if (zipFileInfo == null) {
        throw (0, builder_util_runtime_1.newError)(`ZIP file not provided: ${(0, builder_util_runtime_1.safeStringifyJson)(files)}`, "ERR_UPDATER_ZIP_FILE_NOT_FOUND");
      }
      const provider = downloadUpdateOptions.updateInfoAndProvider.provider;
      const CURRENT_MAC_APP_ZIP_FILE_NAME = "update.zip";
      return this.executeDownload({
        fileExtension: "zip",
        fileInfo: zipFileInfo,
        downloadUpdateOptions,
        task: async (destinationFile, downloadOptions) => {
          const cachedUpdateFilePath = path$1.join(this.downloadedUpdateHelper.cacheDir, CURRENT_MAC_APP_ZIP_FILE_NAME);
          const canDifferentialDownload = () => {
            if (!(0, fs_extra_1.pathExistsSync)(cachedUpdateFilePath)) {
              log.info("Unable to locate previous update.zip for differential download (is this first install?), falling back to full download");
              return false;
            }
            return !downloadUpdateOptions.disableDifferentialDownload;
          };
          let differentialDownloadFailed = true;
          if (canDifferentialDownload()) {
            differentialDownloadFailed = await this.differentialDownloadInstaller(zipFileInfo, downloadUpdateOptions, destinationFile, provider, CURRENT_MAC_APP_ZIP_FILE_NAME);
          }
          if (differentialDownloadFailed) {
            await this.httpExecutor.download(zipFileInfo.url, destinationFile, downloadOptions);
          }
        },
        done: async (event) => {
          if (!downloadUpdateOptions.disableDifferentialDownload) {
            try {
              const cachedUpdateFilePath = path$1.join(this.downloadedUpdateHelper.cacheDir, CURRENT_MAC_APP_ZIP_FILE_NAME);
              await (0, fs_extra_1.copyFile)(event.downloadedFile, cachedUpdateFilePath);
            } catch (error2) {
              this._logger.warn(`Unable to copy file for caching for future differential downloads: ${error2.message}`);
            }
          }
          return this.updateDownloaded(zipFileInfo, event);
        }
      });
    }
    async updateDownloaded(zipFileInfo, event) {
      var _a;
      const downloadedFile = event.downloadedFile;
      const updateFileSize = (_a = zipFileInfo.info.size) !== null && _a !== void 0 ? _a : (await (0, fs_extra_1.stat)(downloadedFile)).size;
      const log = this._logger;
      const logContext = `fileToProxy=${zipFileInfo.url.href}`;
      this.closeServerIfExists();
      this.debug(`Creating proxy server for native Squirrel.Mac (${logContext})`);
      this.server = (0, http_1.createServer)();
      this.debug(`Proxy server for native Squirrel.Mac is created (${logContext})`);
      this.server.on("close", () => {
        log.info(`Proxy server for native Squirrel.Mac is closed (${logContext})`);
      });
      const getServerUrl = (s) => {
        const address = s.address();
        if (typeof address === "string") {
          return address;
        }
        return `http://127.0.0.1:${address === null || address === void 0 ? void 0 : address.port}`;
      };
      return await new Promise((resolve, reject) => {
        const pass = (0, crypto_1.randomBytes)(64).toString("base64").replace(/\//g, "_").replace(/\+/g, "-");
        const authInfo = Buffer.from(`autoupdater:${pass}`, "ascii");
        const fileUrl = `/${(0, crypto_1.randomBytes)(64).toString("hex")}.zip`;
        this.server.on("request", (request, response) => {
          const requestUrl = request.url;
          log.info(`${requestUrl} requested`);
          if (requestUrl === "/") {
            if (!request.headers.authorization || request.headers.authorization.indexOf("Basic ") === -1) {
              response.statusCode = 401;
              response.statusMessage = "Invalid Authentication Credentials";
              response.end();
              log.warn("No authenthication info");
              return;
            }
            const base64Credentials = request.headers.authorization.split(" ")[1];
            const credentials = Buffer.from(base64Credentials, "base64").toString("ascii");
            const [username, password] = credentials.split(":");
            if (username !== "autoupdater" || password !== pass) {
              response.statusCode = 401;
              response.statusMessage = "Invalid Authentication Credentials";
              response.end();
              log.warn("Invalid authenthication credentials");
              return;
            }
            const data = Buffer.from(`{ "url": "${getServerUrl(this.server)}${fileUrl}" }`);
            response.writeHead(200, { "Content-Type": "application/json", "Content-Length": data.length });
            response.end(data);
            return;
          }
          if (!requestUrl.startsWith(fileUrl)) {
            log.warn(`${requestUrl} requested, but not supported`);
            response.writeHead(404);
            response.end();
            return;
          }
          log.info(`${fileUrl} requested by Squirrel.Mac, pipe ${downloadedFile}`);
          let errorOccurred = false;
          response.on("finish", () => {
            if (!errorOccurred) {
              this.nativeUpdater.removeListener("error", reject);
              resolve([]);
            }
          });
          const readStream = (0, fs_1.createReadStream)(downloadedFile);
          readStream.on("error", (error2) => {
            try {
              response.end();
            } catch (e) {
              log.warn(`cannot end response: ${e}`);
            }
            errorOccurred = true;
            this.nativeUpdater.removeListener("error", reject);
            reject(new Error(`Cannot pipe "${downloadedFile}": ${error2}`));
          });
          response.writeHead(200, {
            "Content-Type": "application/zip",
            "Content-Length": updateFileSize
          });
          readStream.pipe(response);
        });
        this.debug(`Proxy server for native Squirrel.Mac is starting to listen (${logContext})`);
        this.server.listen(0, "127.0.0.1", () => {
          this.debug(`Proxy server for native Squirrel.Mac is listening (address=${getServerUrl(this.server)}, ${logContext})`);
          this.nativeUpdater.setFeedURL({
            url: getServerUrl(this.server),
            headers: {
              "Cache-Control": "no-cache",
              Authorization: `Basic ${authInfo.toString("base64")}`
            }
          });
          this.dispatchUpdateDownloaded(event);
          if (this.autoInstallOnAppQuit) {
            this.nativeUpdater.once("error", reject);
            this.nativeUpdater.checkForUpdates();
          } else {
            resolve([]);
          }
        });
      });
    }
    handleUpdateDownloaded() {
      if (this.autoRunAppAfterInstall) {
        this.nativeUpdater.quitAndInstall();
      } else {
        this.app.quit();
      }
      this.closeServerIfExists();
    }
    quitAndInstall() {
      if (this.squirrelDownloadedUpdate) {
        this.handleUpdateDownloaded();
      } else {
        this.nativeUpdater.on("update-downloaded", () => this.handleUpdateDownloaded());
        if (!this.autoInstallOnAppQuit) {
          this.nativeUpdater.checkForUpdates();
        }
      }
    }
  };
  MacUpdater.MacUpdater = MacUpdater$1;
  return MacUpdater;
}
var NsisUpdater = {};
var windowsExecutableCodeSignatureVerifier = {};
var hasRequiredWindowsExecutableCodeSignatureVerifier;
function requireWindowsExecutableCodeSignatureVerifier() {
  if (hasRequiredWindowsExecutableCodeSignatureVerifier) return windowsExecutableCodeSignatureVerifier;
  hasRequiredWindowsExecutableCodeSignatureVerifier = 1;
  Object.defineProperty(windowsExecutableCodeSignatureVerifier, "__esModule", { value: true });
  windowsExecutableCodeSignatureVerifier.verifySignature = verifySignature;
  const builder_util_runtime_1 = requireOut();
  const child_process_1 = require$$0$4;
  const os = require$$2;
  const path$1 = path;
  function verifySignature(publisherNames, unescapedTempUpdateFile, logger) {
    return new Promise((resolve, reject) => {
      const tempUpdateFile = unescapedTempUpdateFile.replace(/'/g, "''");
      logger.info(`Verifying signature ${tempUpdateFile}`);
      (0, child_process_1.execFile)(`set "PSModulePath=" & chcp 65001 >NUL & powershell.exe`, ["-NoProfile", "-NonInteractive", "-InputFormat", "None", "-Command", `"Get-AuthenticodeSignature -LiteralPath '${tempUpdateFile}' | ConvertTo-Json -Compress"`], {
        shell: true,
        timeout: 20 * 1e3
      }, (error2, stdout, stderr) => {
        var _a;
        try {
          if (error2 != null || stderr) {
            handleError(logger, error2, stderr, reject);
            resolve(null);
            return;
          }
          const data = parseOut(stdout);
          if (data.Status === 0) {
            try {
              const normlaizedUpdateFilePath = path$1.normalize(data.Path);
              const normalizedTempUpdateFile = path$1.normalize(unescapedTempUpdateFile);
              logger.info(`LiteralPath: ${normlaizedUpdateFilePath}. Update Path: ${normalizedTempUpdateFile}`);
              if (normlaizedUpdateFilePath !== normalizedTempUpdateFile) {
                handleError(logger, new Error(`LiteralPath of ${normlaizedUpdateFilePath} is different than ${normalizedTempUpdateFile}`), stderr, reject);
                resolve(null);
                return;
              }
            } catch (error3) {
              logger.warn(`Unable to verify LiteralPath of update asset due to missing data.Path. Skipping this step of validation. Message: ${(_a = error3.message) !== null && _a !== void 0 ? _a : error3.stack}`);
            }
            const subject = (0, builder_util_runtime_1.parseDn)(data.SignerCertificate.Subject);
            let match = false;
            for (const name of publisherNames) {
              const dn = (0, builder_util_runtime_1.parseDn)(name);
              if (dn.size) {
                const allKeys = Array.from(dn.keys());
                match = allKeys.every((key) => {
                  return dn.get(key) === subject.get(key);
                });
              } else if (name === subject.get("CN")) {
                logger.warn(`Signature validated using only CN ${name}. Please add your full Distinguished Name (DN) to publisherNames configuration`);
                match = true;
              }
              if (match) {
                resolve(null);
                return;
              }
            }
          }
          const result = `publisherNames: ${publisherNames.join(" | ")}, raw info: ` + JSON.stringify(data, (name, value) => name === "RawData" ? void 0 : value, 2);
          logger.warn(`Sign verification failed, installer signed with incorrect certificate: ${result}`);
          resolve(result);
        } catch (e) {
          handleError(logger, e, null, reject);
          resolve(null);
          return;
        }
      });
    });
  }
  function parseOut(out2) {
    const data = JSON.parse(out2);
    delete data.PrivateKey;
    delete data.IsOSBinary;
    delete data.SignatureType;
    const signerCertificate = data.SignerCertificate;
    if (signerCertificate != null) {
      delete signerCertificate.Archived;
      delete signerCertificate.Extensions;
      delete signerCertificate.Handle;
      delete signerCertificate.HasPrivateKey;
      delete signerCertificate.SubjectName;
    }
    return data;
  }
  function handleError(logger, error2, stderr, reject) {
    if (isOldWin6()) {
      logger.warn(`Cannot execute Get-AuthenticodeSignature: ${error2 || stderr}. Ignoring signature validation due to unsupported powershell version. Please upgrade to powershell 3 or higher.`);
      return;
    }
    try {
      (0, child_process_1.execFileSync)("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", "ConvertTo-Json test"], { timeout: 10 * 1e3 });
    } catch (testError) {
      logger.warn(`Cannot execute ConvertTo-Json: ${testError.message}. Ignoring signature validation due to unsupported powershell version. Please upgrade to powershell 3 or higher.`);
      return;
    }
    if (error2 != null) {
      reject(error2);
    }
    if (stderr) {
      reject(new Error(`Cannot execute Get-AuthenticodeSignature, stderr: ${stderr}. Failing signature validation due to unknown stderr.`));
    }
  }
  function isOldWin6() {
    const winVersion = os.release();
    return winVersion.startsWith("6.") && !winVersion.startsWith("6.3");
  }
  return windowsExecutableCodeSignatureVerifier;
}
var hasRequiredNsisUpdater;
function requireNsisUpdater() {
  if (hasRequiredNsisUpdater) return NsisUpdater;
  hasRequiredNsisUpdater = 1;
  Object.defineProperty(NsisUpdater, "__esModule", { value: true });
  NsisUpdater.NsisUpdater = void 0;
  const builder_util_runtime_1 = requireOut();
  const path$1 = path;
  const BaseUpdater_1 = requireBaseUpdater();
  const FileWithEmbeddedBlockMapDifferentialDownloader_1 = requireFileWithEmbeddedBlockMapDifferentialDownloader();
  const types_1 = requireTypes();
  const Provider_1 = requireProvider();
  const fs_extra_1 = /* @__PURE__ */ requireLib();
  const windowsExecutableCodeSignatureVerifier_1 = requireWindowsExecutableCodeSignatureVerifier();
  const url_1 = require$$4;
  let NsisUpdater$1 = class NsisUpdater extends BaseUpdater_1.BaseUpdater {
    constructor(options, app) {
      super(options, app);
      this._verifyUpdateCodeSignature = (publisherNames, unescapedTempUpdateFile) => (0, windowsExecutableCodeSignatureVerifier_1.verifySignature)(publisherNames, unescapedTempUpdateFile, this._logger);
    }
    /**
     * The verifyUpdateCodeSignature. You can pass [win-verify-signature](https://github.com/beyondkmp/win-verify-trust) or another custom verify function: ` (publisherName: string[], path: string) => Promise<string | null>`.
     * The default verify function uses [windowsExecutableCodeSignatureVerifier](https://github.com/electron-userland/electron-builder/blob/master/packages/electron-updater/src/windowsExecutableCodeSignatureVerifier.ts)
     */
    get verifyUpdateCodeSignature() {
      return this._verifyUpdateCodeSignature;
    }
    set verifyUpdateCodeSignature(value) {
      if (value) {
        this._verifyUpdateCodeSignature = value;
      }
    }
    /*** @private */
    doDownloadUpdate(downloadUpdateOptions) {
      const provider = downloadUpdateOptions.updateInfoAndProvider.provider;
      const fileInfo = (0, Provider_1.findFile)(provider.resolveFiles(downloadUpdateOptions.updateInfoAndProvider.info), "exe");
      return this.executeDownload({
        fileExtension: "exe",
        downloadUpdateOptions,
        fileInfo,
        task: async (destinationFile, downloadOptions, packageFile, removeTempDirIfAny) => {
          const packageInfo = fileInfo.packageInfo;
          const isWebInstaller = packageInfo != null && packageFile != null;
          if (isWebInstaller && downloadUpdateOptions.disableWebInstaller) {
            throw (0, builder_util_runtime_1.newError)(`Unable to download new version ${downloadUpdateOptions.updateInfoAndProvider.info.version}. Web Installers are disabled`, "ERR_UPDATER_WEB_INSTALLER_DISABLED");
          }
          if (!isWebInstaller && !downloadUpdateOptions.disableWebInstaller) {
            this._logger.warn("disableWebInstaller is set to false, you should set it to true if you do not plan on using a web installer. This will default to true in a future version.");
          }
          if (isWebInstaller || downloadUpdateOptions.disableDifferentialDownload || await this.differentialDownloadInstaller(fileInfo, downloadUpdateOptions, destinationFile, provider, builder_util_runtime_1.CURRENT_APP_INSTALLER_FILE_NAME)) {
            await this.httpExecutor.download(fileInfo.url, destinationFile, downloadOptions);
          }
          const signatureVerificationStatus = await this.verifySignature(destinationFile);
          if (signatureVerificationStatus != null) {
            await removeTempDirIfAny();
            throw (0, builder_util_runtime_1.newError)(`New version ${downloadUpdateOptions.updateInfoAndProvider.info.version} is not signed by the application owner: ${signatureVerificationStatus}`, "ERR_UPDATER_INVALID_SIGNATURE");
          }
          if (isWebInstaller) {
            if (await this.differentialDownloadWebPackage(downloadUpdateOptions, packageInfo, packageFile, provider)) {
              try {
                await this.httpExecutor.download(new url_1.URL(packageInfo.path), packageFile, {
                  headers: downloadUpdateOptions.requestHeaders,
                  cancellationToken: downloadUpdateOptions.cancellationToken,
                  sha512: packageInfo.sha512
                });
              } catch (e) {
                try {
                  await (0, fs_extra_1.unlink)(packageFile);
                } catch (_ignored) {
                }
                throw e;
              }
            }
          }
        }
      });
    }
    // $certificateInfo = (Get-AuthenticodeSignature 'xxx\yyy.exe'
    // | where {$_.Status.Equals([System.Management.Automation.SignatureStatus]::Valid) -and $_.SignerCertificate.Subject.Contains("CN=siemens.com")})
    // | Out-String ; if ($certificateInfo) { exit 0 } else { exit 1 }
    async verifySignature(tempUpdateFile) {
      let publisherName;
      try {
        publisherName = (await this.configOnDisk.value).publisherName;
        if (publisherName == null) {
          return null;
        }
      } catch (e) {
        if (e.code === "ENOENT") {
          return null;
        }
        throw e;
      }
      return await this._verifyUpdateCodeSignature(Array.isArray(publisherName) ? publisherName : [publisherName], tempUpdateFile);
    }
    doInstall(options) {
      const installerPath = this.installerPath;
      if (installerPath == null) {
        this.dispatchError(new Error("No valid update available, can't quit and install"));
        return false;
      }
      const args = ["--updated"];
      if (options.isSilent) {
        args.push("/S");
      }
      if (options.isForceRunAfter) {
        args.push("--force-run");
      }
      if (this.installDirectory) {
        args.push(`/D=${this.installDirectory}`);
      }
      const packagePath = this.downloadedUpdateHelper == null ? null : this.downloadedUpdateHelper.packageFile;
      if (packagePath != null) {
        args.push(`--package-file=${packagePath}`);
      }
      const callUsingElevation = () => {
        this.spawnLog(path$1.join(process.resourcesPath, "elevate.exe"), [installerPath].concat(args)).catch((e) => this.dispatchError(e));
      };
      if (options.isAdminRightsRequired) {
        this._logger.info("isAdminRightsRequired is set to true, run installer using elevate.exe");
        callUsingElevation();
        return true;
      }
      this.spawnLog(installerPath, args).catch((e) => {
        const errorCode = e.code;
        this._logger.info(`Cannot run installer: error code: ${errorCode}, error message: "${e.message}", will be executed again using elevate if EACCES, and will try to use electron.shell.openItem if ENOENT`);
        if (errorCode === "UNKNOWN" || errorCode === "EACCES") {
          callUsingElevation();
        } else if (errorCode === "ENOENT") {
          require$$1$3.shell.openPath(installerPath).catch((err) => this.dispatchError(err));
        } else {
          this.dispatchError(e);
        }
      });
      return true;
    }
    async differentialDownloadWebPackage(downloadUpdateOptions, packageInfo, packagePath, provider) {
      if (packageInfo.blockMapSize == null) {
        return true;
      }
      try {
        const downloadOptions = {
          newUrl: new url_1.URL(packageInfo.path),
          oldFile: path$1.join(this.downloadedUpdateHelper.cacheDir, builder_util_runtime_1.CURRENT_APP_PACKAGE_FILE_NAME),
          logger: this._logger,
          newFile: packagePath,
          requestHeaders: this.requestHeaders,
          isUseMultipleRangeRequest: provider.isUseMultipleRangeRequest,
          cancellationToken: downloadUpdateOptions.cancellationToken
        };
        if (this.listenerCount(types_1.DOWNLOAD_PROGRESS) > 0) {
          downloadOptions.onProgress = (it) => this.emit(types_1.DOWNLOAD_PROGRESS, it);
        }
        await new FileWithEmbeddedBlockMapDifferentialDownloader_1.FileWithEmbeddedBlockMapDifferentialDownloader(packageInfo, this.httpExecutor, downloadOptions).download();
      } catch (e) {
        this._logger.error(`Cannot download differentially, fallback to full download: ${e.stack || e}`);
        return process.platform === "win32";
      }
      return false;
    }
  };
  NsisUpdater.NsisUpdater = NsisUpdater$1;
  return NsisUpdater;
}
var hasRequiredMain;
function requireMain() {
  if (hasRequiredMain) return main$1;
  hasRequiredMain = 1;
  (function(exports) {
    var __createBinding = main$1 && main$1.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __exportStar = main$1 && main$1.__exportStar || function(m, exports2) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p)) __createBinding(exports2, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.NsisUpdater = exports.MacUpdater = exports.RpmUpdater = exports.PacmanUpdater = exports.DebUpdater = exports.AppImageUpdater = exports.Provider = exports.NoOpLogger = exports.AppUpdater = exports.BaseUpdater = void 0;
    const fs_extra_1 = /* @__PURE__ */ requireLib();
    const path$1 = path;
    var BaseUpdater_1 = requireBaseUpdater();
    Object.defineProperty(exports, "BaseUpdater", { enumerable: true, get: function() {
      return BaseUpdater_1.BaseUpdater;
    } });
    var AppUpdater_1 = requireAppUpdater();
    Object.defineProperty(exports, "AppUpdater", { enumerable: true, get: function() {
      return AppUpdater_1.AppUpdater;
    } });
    Object.defineProperty(exports, "NoOpLogger", { enumerable: true, get: function() {
      return AppUpdater_1.NoOpLogger;
    } });
    var Provider_1 = requireProvider();
    Object.defineProperty(exports, "Provider", { enumerable: true, get: function() {
      return Provider_1.Provider;
    } });
    var AppImageUpdater_1 = requireAppImageUpdater();
    Object.defineProperty(exports, "AppImageUpdater", { enumerable: true, get: function() {
      return AppImageUpdater_1.AppImageUpdater;
    } });
    var DebUpdater_1 = requireDebUpdater();
    Object.defineProperty(exports, "DebUpdater", { enumerable: true, get: function() {
      return DebUpdater_1.DebUpdater;
    } });
    var PacmanUpdater_1 = requirePacmanUpdater();
    Object.defineProperty(exports, "PacmanUpdater", { enumerable: true, get: function() {
      return PacmanUpdater_1.PacmanUpdater;
    } });
    var RpmUpdater_1 = requireRpmUpdater();
    Object.defineProperty(exports, "RpmUpdater", { enumerable: true, get: function() {
      return RpmUpdater_1.RpmUpdater;
    } });
    var MacUpdater_1 = requireMacUpdater();
    Object.defineProperty(exports, "MacUpdater", { enumerable: true, get: function() {
      return MacUpdater_1.MacUpdater;
    } });
    var NsisUpdater_1 = requireNsisUpdater();
    Object.defineProperty(exports, "NsisUpdater", { enumerable: true, get: function() {
      return NsisUpdater_1.NsisUpdater;
    } });
    __exportStar(requireTypes(), exports);
    let _autoUpdater;
    function doLoadAutoUpdater() {
      if (process.platform === "win32") {
        _autoUpdater = new (requireNsisUpdater()).NsisUpdater();
      } else if (process.platform === "darwin") {
        _autoUpdater = new (requireMacUpdater()).MacUpdater();
      } else {
        _autoUpdater = new (requireAppImageUpdater()).AppImageUpdater();
        try {
          const identity = path$1.join(process.resourcesPath, "package-type");
          if (!(0, fs_extra_1.existsSync)(identity)) {
            return _autoUpdater;
          }
          console.info("Checking for beta autoupdate feature for deb/rpm distributions");
          const fileType = (0, fs_extra_1.readFileSync)(identity).toString().trim();
          console.info("Found package-type:", fileType);
          switch (fileType) {
            case "deb":
              _autoUpdater = new (requireDebUpdater()).DebUpdater();
              break;
            case "rpm":
              _autoUpdater = new (requireRpmUpdater()).RpmUpdater();
              break;
            case "pacman":
              _autoUpdater = new (requirePacmanUpdater()).PacmanUpdater();
              break;
            default:
              break;
          }
        } catch (error2) {
          console.warn("Unable to detect 'package-type' for autoUpdater (beta rpm/deb support). If you'd like to expand support, please consider contributing to electron-builder", error2.message);
        }
      }
      return _autoUpdater;
    }
    Object.defineProperty(exports, "autoUpdater", {
      enumerable: true,
      get: () => {
        return _autoUpdater || doLoadAutoUpdater();
      }
    });
  })(main$1);
  return main$1;
}
var mainExports = requireMain();
var utils = { exports: {} };
var windows;
var hasRequiredWindows;
function requireWindows() {
  if (hasRequiredWindows) return windows;
  hasRequiredWindows = 1;
  windows = isexe;
  isexe.sync = sync;
  var fs2 = fs$1;
  function checkPathExt(path2, options) {
    var pathext = options.pathExt !== void 0 ? options.pathExt : process.env.PATHEXT;
    if (!pathext) {
      return true;
    }
    pathext = pathext.split(";");
    if (pathext.indexOf("") !== -1) {
      return true;
    }
    for (var i = 0; i < pathext.length; i++) {
      var p = pathext[i].toLowerCase();
      if (p && path2.substr(-p.length).toLowerCase() === p) {
        return true;
      }
    }
    return false;
  }
  function checkStat(stat2, path2, options) {
    if (!stat2.isSymbolicLink() && !stat2.isFile()) {
      return false;
    }
    return checkPathExt(path2, options);
  }
  function isexe(path2, options, cb) {
    fs2.stat(path2, function(er, stat2) {
      cb(er, er ? false : checkStat(stat2, path2, options));
    });
  }
  function sync(path2, options) {
    return checkStat(fs2.statSync(path2), path2, options);
  }
  return windows;
}
var mode;
var hasRequiredMode;
function requireMode() {
  if (hasRequiredMode) return mode;
  hasRequiredMode = 1;
  mode = isexe;
  isexe.sync = sync;
  var fs2 = fs$1;
  function isexe(path2, options, cb) {
    fs2.stat(path2, function(er, stat2) {
      cb(er, er ? false : checkStat(stat2, options));
    });
  }
  function sync(path2, options) {
    return checkStat(fs2.statSync(path2), options);
  }
  function checkStat(stat2, options) {
    return stat2.isFile() && checkMode(stat2, options);
  }
  function checkMode(stat2, options) {
    var mod = stat2.mode;
    var uid = stat2.uid;
    var gid = stat2.gid;
    var myUid = options.uid !== void 0 ? options.uid : process.getuid && process.getuid();
    var myGid = options.gid !== void 0 ? options.gid : process.getgid && process.getgid();
    var u = parseInt("100", 8);
    var g = parseInt("010", 8);
    var o = parseInt("001", 8);
    var ug = u | g;
    var ret = mod & o || mod & g && gid === myGid || mod & u && uid === myUid || mod & ug && myUid === 0;
    return ret;
  }
  return mode;
}
var isexe_1;
var hasRequiredIsexe;
function requireIsexe() {
  if (hasRequiredIsexe) return isexe_1;
  hasRequiredIsexe = 1;
  var core2;
  if (process.platform === "win32" || commonjsGlobal.TESTING_WINDOWS) {
    core2 = requireWindows();
  } else {
    core2 = requireMode();
  }
  isexe_1 = isexe;
  isexe.sync = sync;
  function isexe(path2, options, cb) {
    if (typeof options === "function") {
      cb = options;
      options = {};
    }
    if (!cb) {
      if (typeof Promise !== "function") {
        throw new TypeError("callback not provided");
      }
      return new Promise(function(resolve, reject) {
        isexe(path2, options || {}, function(er, is) {
          if (er) {
            reject(er);
          } else {
            resolve(is);
          }
        });
      });
    }
    core2(path2, options || {}, function(er, is) {
      if (er) {
        if (er.code === "EACCES" || options && options.ignoreErrors) {
          er = null;
          is = false;
        }
      }
      cb(er, is);
    });
  }
  function sync(path2, options) {
    try {
      return core2.sync(path2, options || {});
    } catch (er) {
      if (options && options.ignoreErrors || er.code === "EACCES") {
        return false;
      } else {
        throw er;
      }
    }
  }
  return isexe_1;
}
var which_1;
var hasRequiredWhich;
function requireWhich() {
  if (hasRequiredWhich) return which_1;
  hasRequiredWhich = 1;
  which_1 = which;
  which.sync = whichSync;
  var isWindows = process.platform === "win32" || process.env.OSTYPE === "cygwin" || process.env.OSTYPE === "msys";
  var path$1 = path;
  var COLON = isWindows ? ";" : ":";
  var isexe = requireIsexe();
  function getNotFoundError(cmd) {
    var er = new Error("not found: " + cmd);
    er.code = "ENOENT";
    return er;
  }
  function getPathInfo(cmd, opt) {
    var colon = opt.colon || COLON;
    var pathEnv = opt.path || process.env.PATH || "";
    var pathExt = [""];
    pathEnv = pathEnv.split(colon);
    var pathExtExe = "";
    if (isWindows) {
      pathEnv.unshift(process.cwd());
      pathExtExe = opt.pathExt || process.env.PATHEXT || ".EXE;.CMD;.BAT;.COM";
      pathExt = pathExtExe.split(colon);
      if (cmd.indexOf(".") !== -1 && pathExt[0] !== "")
        pathExt.unshift("");
    }
    if (cmd.match(/\//) || isWindows && cmd.match(/\\/))
      pathEnv = [""];
    return {
      env: pathEnv,
      ext: pathExt,
      extExe: pathExtExe
    };
  }
  function which(cmd, opt, cb) {
    if (typeof opt === "function") {
      cb = opt;
      opt = {};
    }
    var info = getPathInfo(cmd, opt);
    var pathEnv = info.env;
    var pathExt = info.ext;
    var pathExtExe = info.extExe;
    var found = [];
    (function F(i, l) {
      if (i === l) {
        if (opt.all && found.length)
          return cb(null, found);
        else
          return cb(getNotFoundError(cmd));
      }
      var pathPart = pathEnv[i];
      if (pathPart.charAt(0) === '"' && pathPart.slice(-1) === '"')
        pathPart = pathPart.slice(1, -1);
      var p = path$1.join(pathPart, cmd);
      if (!pathPart && /^\.[\\\/]/.test(cmd)) {
        p = cmd.slice(0, 2) + p;
      }
      (function E(ii, ll) {
        if (ii === ll) return F(i + 1, l);
        var ext = pathExt[ii];
        isexe(p + ext, { pathExt: pathExtExe }, function(er, is) {
          if (!er && is) {
            if (opt.all)
              found.push(p + ext);
            else
              return cb(null, p + ext);
          }
          return E(ii + 1, ll);
        });
      })(0, pathExt.length);
    })(0, pathEnv.length);
  }
  function whichSync(cmd, opt) {
    opt = opt || {};
    var info = getPathInfo(cmd, opt);
    var pathEnv = info.env;
    var pathExt = info.ext;
    var pathExtExe = info.extExe;
    var found = [];
    for (var i = 0, l = pathEnv.length; i < l; i++) {
      var pathPart = pathEnv[i];
      if (pathPart.charAt(0) === '"' && pathPart.slice(-1) === '"')
        pathPart = pathPart.slice(1, -1);
      var p = path$1.join(pathPart, cmd);
      if (!pathPart && /^\.[\\\/]/.test(cmd)) {
        p = cmd.slice(0, 2) + p;
      }
      for (var j = 0, ll = pathExt.length; j < ll; j++) {
        var cur = p + pathExt[j];
        var is;
        try {
          is = isexe.sync(cur, { pathExt: pathExtExe });
          if (is) {
            if (opt.all)
              found.push(cur);
            else
              return cur;
          }
        } catch (ex) {
        }
      }
    }
    if (opt.all && found.length)
      return found;
    if (opt.nothrow)
      return null;
    throw getNotFoundError(cmd);
  }
  return which_1;
}
var hasRequiredUtils;
function requireUtils() {
  if (hasRequiredUtils) return utils.exports;
  hasRequiredUtils = 1;
  require$$0$4.exec;
  var isWindows = require$$2.platform().match(/win(32|64)/);
  var which = requireWhich();
  var nlRegexp = /\r\n|\r|\n/g;
  var streamRegexp = /^\[?(.*?)\]?$/;
  var filterEscapeRegexp = /[,]/;
  var whichCache = {};
  function parseProgressLine(line) {
    var progress = {};
    line = line.replace(/=\s+/g, "=").trim();
    var progressParts = line.split(" ");
    for (var i = 0; i < progressParts.length; i++) {
      var progressSplit = progressParts[i].split("=", 2);
      var key = progressSplit[0];
      var value = progressSplit[1];
      if (typeof value === "undefined")
        return null;
      progress[key] = value;
    }
    return progress;
  }
  var utils$12 = utils.exports = {
    isWindows,
    streamRegexp,
    /**
     * Copy an object keys into another one
     *
     * @param {Object} source source object
     * @param {Object} dest destination object
     * @private
     */
    copy: function(source, dest) {
      Object.keys(source).forEach(function(key) {
        dest[key] = source[key];
      });
    },
    /**
     * Create an argument list
     *
     * Returns a function that adds new arguments to the list.
     * It also has the following methods:
     * - clear() empties the argument list
     * - get() returns the argument list
     * - find(arg, count) finds 'arg' in the list and return the following 'count' items, or undefined if not found
     * - remove(arg, count) remove 'arg' in the list as well as the following 'count' items
     *
     * @private
     */
    args: function() {
      var list = [];
      var argfunc = function() {
        if (arguments.length === 1 && Array.isArray(arguments[0])) {
          list = list.concat(arguments[0]);
        } else {
          list = list.concat([].slice.call(arguments));
        }
      };
      argfunc.clear = function() {
        list = [];
      };
      argfunc.get = function() {
        return list;
      };
      argfunc.find = function(arg, count) {
        var index = list.indexOf(arg);
        if (index !== -1) {
          return list.slice(index + 1, index + 1 + (count || 0));
        }
      };
      argfunc.remove = function(arg, count) {
        var index = list.indexOf(arg);
        if (index !== -1) {
          list.splice(index, (count || 0) + 1);
        }
      };
      argfunc.clone = function() {
        var cloned = utils$12.args();
        cloned(list);
        return cloned;
      };
      return argfunc;
    },
    /**
     * Generate filter strings
     *
     * @param {String[]|Object[]} filters filter specifications. When using objects,
     *   each must have the following properties:
     * @param {String} filters.filter filter name
     * @param {String|Array} [filters.inputs] (array of) input stream specifier(s) for the filter,
     *   defaults to ffmpeg automatically choosing the first unused matching streams
     * @param {String|Array} [filters.outputs] (array of) output stream specifier(s) for the filter,
     *   defaults to ffmpeg automatically assigning the output to the output file
     * @param {Object|String|Array} [filters.options] filter options, can be omitted to not set any options
     * @return String[]
     * @private
     */
    makeFilterStrings: function(filters) {
      return filters.map(function(filterSpec) {
        if (typeof filterSpec === "string") {
          return filterSpec;
        }
        var filterString = "";
        if (Array.isArray(filterSpec.inputs)) {
          filterString += filterSpec.inputs.map(function(streamSpec) {
            return streamSpec.replace(streamRegexp, "[$1]");
          }).join("");
        } else if (typeof filterSpec.inputs === "string") {
          filterString += filterSpec.inputs.replace(streamRegexp, "[$1]");
        }
        filterString += filterSpec.filter;
        if (filterSpec.options) {
          if (typeof filterSpec.options === "string" || typeof filterSpec.options === "number") {
            filterString += "=" + filterSpec.options;
          } else if (Array.isArray(filterSpec.options)) {
            filterString += "=" + filterSpec.options.map(function(option) {
              if (typeof option === "string" && option.match(filterEscapeRegexp)) {
                return "'" + option + "'";
              } else {
                return option;
              }
            }).join(":");
          } else if (Object.keys(filterSpec.options).length) {
            filterString += "=" + Object.keys(filterSpec.options).map(function(option) {
              var value = filterSpec.options[option];
              if (typeof value === "string" && value.match(filterEscapeRegexp)) {
                value = "'" + value + "'";
              }
              return option + "=" + value;
            }).join(":");
          }
        }
        if (Array.isArray(filterSpec.outputs)) {
          filterString += filterSpec.outputs.map(function(streamSpec) {
            return streamSpec.replace(streamRegexp, "[$1]");
          }).join("");
        } else if (typeof filterSpec.outputs === "string") {
          filterString += filterSpec.outputs.replace(streamRegexp, "[$1]");
        }
        return filterString;
      });
    },
    /**
     * Search for an executable
     *
     * Uses 'which' or 'where' depending on platform
     *
     * @param {String} name executable name
     * @param {Function} callback callback with signature (err, path)
     * @private
     */
    which: function(name, callback) {
      if (name in whichCache) {
        return callback(null, whichCache[name]);
      }
      which(name, function(err, result) {
        if (err) {
          return callback(null, whichCache[name] = "");
        }
        callback(null, whichCache[name] = result);
      });
    },
    /**
     * Convert a [[hh:]mm:]ss[.xxx] timemark into seconds
     *
     * @param {String} timemark timemark string
     * @return Number
     * @private
     */
    timemarkToSeconds: function(timemark) {
      if (typeof timemark === "number") {
        return timemark;
      }
      if (timemark.indexOf(":") === -1 && timemark.indexOf(".") >= 0) {
        return Number(timemark);
      }
      var parts = timemark.split(":");
      var secs = Number(parts.pop());
      if (parts.length) {
        secs += Number(parts.pop()) * 60;
      }
      if (parts.length) {
        secs += Number(parts.pop()) * 3600;
      }
      return secs;
    },
    /**
     * Extract codec data from ffmpeg stderr and emit 'codecData' event if appropriate
     * Call it with an initially empty codec object once with each line of stderr output until it returns true
     *
     * @param {FfmpegCommand} command event emitter
     * @param {String} stderrLine ffmpeg stderr output line
     * @param {Object} codecObject object used to accumulate codec data between calls
     * @return {Boolean} true if codec data is complete (and event was emitted), false otherwise
     * @private
     */
    extractCodecData: function(command, stderrLine, codecsObject) {
      var inputPattern = /Input #[0-9]+, ([^ ]+),/;
      var durPattern = /Duration\: ([^,]+)/;
      var audioPattern = /Audio\: (.*)/;
      var videoPattern = /Video\: (.*)/;
      if (!("inputStack" in codecsObject)) {
        codecsObject.inputStack = [];
        codecsObject.inputIndex = -1;
        codecsObject.inInput = false;
      }
      var inputStack = codecsObject.inputStack;
      var inputIndex = codecsObject.inputIndex;
      var inInput = codecsObject.inInput;
      var format, dur, audio2, video2;
      if (format = stderrLine.match(inputPattern)) {
        inInput = codecsObject.inInput = true;
        inputIndex = codecsObject.inputIndex = codecsObject.inputIndex + 1;
        inputStack[inputIndex] = { format: format[1], audio: "", video: "", duration: "" };
      } else if (inInput && (dur = stderrLine.match(durPattern))) {
        inputStack[inputIndex].duration = dur[1];
      } else if (inInput && (audio2 = stderrLine.match(audioPattern))) {
        audio2 = audio2[1].split(", ");
        inputStack[inputIndex].audio = audio2[0];
        inputStack[inputIndex].audio_details = audio2;
      } else if (inInput && (video2 = stderrLine.match(videoPattern))) {
        video2 = video2[1].split(", ");
        inputStack[inputIndex].video = video2[0];
        inputStack[inputIndex].video_details = video2;
      } else if (/Output #\d+/.test(stderrLine)) {
        inInput = codecsObject.inInput = false;
      } else if (/Stream mapping:|Press (\[q\]|ctrl-c) to stop/.test(stderrLine)) {
        command.emit.apply(command, ["codecData"].concat(inputStack));
        return true;
      }
      return false;
    },
    /**
     * Extract progress data from ffmpeg stderr and emit 'progress' event if appropriate
     *
     * @param {FfmpegCommand} command event emitter
     * @param {String} stderrLine ffmpeg stderr data
     * @private
     */
    extractProgress: function(command, stderrLine) {
      var progress = parseProgressLine(stderrLine);
      if (progress) {
        var ret = {
          frames: parseInt(progress.frame, 10),
          currentFps: parseInt(progress.fps, 10),
          currentKbps: progress.bitrate ? parseFloat(progress.bitrate.replace("kbits/s", "")) : 0,
          targetSize: parseInt(progress.size || progress.Lsize, 10),
          timemark: progress.time
        };
        if (command._ffprobeData && command._ffprobeData.format && command._ffprobeData.format.duration) {
          var duration = Number(command._ffprobeData.format.duration);
          if (!isNaN(duration))
            ret.percent = utils$12.timemarkToSeconds(ret.timemark) / duration * 100;
        }
        command.emit("progress", ret);
      }
    },
    /**
     * Extract error message(s) from ffmpeg stderr
     *
     * @param {String} stderr ffmpeg stderr data
     * @return {String}
     * @private
     */
    extractError: function(stderr) {
      return stderr.split(nlRegexp).reduce(function(messages, message) {
        if (message.charAt(0) === " " || message.charAt(0) === "[") {
          return [];
        } else {
          messages.push(message);
          return messages;
        }
      }, []).join("\n");
    },
    /**
     * Creates a line ring buffer object with the following methods:
     * - append(str) : appends a string or buffer
     * - get() : returns the whole string
     * - close() : prevents further append() calls and does a last call to callbacks
     * - callback(cb) : calls cb for each line (incl. those already in the ring)
     *
     * @param {Number} maxLines maximum number of lines to store (<= 0 for unlimited)
     */
    linesRing: function(maxLines) {
      var cbs = [];
      var lines = [];
      var current = null;
      var closed = false;
      var max = maxLines - 1;
      function emit(line) {
        cbs.forEach(function(cb) {
          cb(line);
        });
      }
      return {
        callback: function(cb) {
          lines.forEach(function(l) {
            cb(l);
          });
          cbs.push(cb);
        },
        append: function(str2) {
          if (closed) return;
          if (str2 instanceof Buffer) str2 = "" + str2;
          if (!str2 || str2.length === 0) return;
          var newLines = str2.split(nlRegexp);
          if (newLines.length === 1) {
            if (current !== null) {
              current = current + newLines.shift();
            } else {
              current = newLines.shift();
            }
          } else {
            if (current !== null) {
              current = current + newLines.shift();
              emit(current);
              lines.push(current);
            }
            current = newLines.pop();
            newLines.forEach(function(l) {
              emit(l);
              lines.push(l);
            });
            if (max > -1 && lines.length > max) {
              lines.splice(0, lines.length - max);
            }
          }
        },
        get: function() {
          if (current !== null) {
            return lines.concat([current]).join("\n");
          } else {
            return lines.join("\n");
          }
        },
        close: function() {
          if (closed) return;
          if (current !== null) {
            emit(current);
            lines.push(current);
            if (max > -1 && lines.length > max) {
              lines.shift();
            }
            current = null;
          }
          closed = true;
        }
      };
    }
  };
  return utils.exports;
}
var inputs;
var hasRequiredInputs;
function requireInputs() {
  if (hasRequiredInputs) return inputs;
  hasRequiredInputs = 1;
  var utils2 = requireUtils();
  inputs = function(proto) {
    proto.mergeAdd = proto.addInput = proto.input = function(source) {
      var isFile = false;
      var isStream = false;
      if (typeof source !== "string") {
        if (!("readable" in source) || !source.readable) {
          throw new Error("Invalid input");
        }
        var hasInputStream = this._inputs.some(function(input) {
          return input.isStream;
        });
        if (hasInputStream) {
          throw new Error("Only one input stream is supported");
        }
        isStream = true;
        source.pause();
      } else {
        var protocol = source.match(/^([a-z]{2,}):/i);
        isFile = !protocol || protocol[0] === "file";
      }
      this._inputs.push(this._currentInput = {
        source,
        isFile,
        isStream,
        options: utils2.args()
      });
      return this;
    };
    proto.withInputFormat = proto.inputFormat = proto.fromFormat = function(format) {
      if (!this._currentInput) {
        throw new Error("No input specified");
      }
      this._currentInput.options("-f", format);
      return this;
    };
    proto.withInputFps = proto.withInputFPS = proto.withFpsInput = proto.withFPSInput = proto.inputFPS = proto.inputFps = proto.fpsInput = proto.FPSInput = function(fps) {
      if (!this._currentInput) {
        throw new Error("No input specified");
      }
      this._currentInput.options("-r", fps);
      return this;
    };
    proto.nativeFramerate = proto.withNativeFramerate = proto.native = function() {
      if (!this._currentInput) {
        throw new Error("No input specified");
      }
      this._currentInput.options("-re");
      return this;
    };
    proto.setStartTime = proto.seekInput = function(seek) {
      if (!this._currentInput) {
        throw new Error("No input specified");
      }
      this._currentInput.options("-ss", seek);
      return this;
    };
    proto.loop = function(duration) {
      if (!this._currentInput) {
        throw new Error("No input specified");
      }
      this._currentInput.options("-loop", "1");
      if (typeof duration !== "undefined") {
        this.duration(duration);
      }
      return this;
    };
  };
  return inputs;
}
var audio;
var hasRequiredAudio;
function requireAudio() {
  if (hasRequiredAudio) return audio;
  hasRequiredAudio = 1;
  var utils2 = requireUtils();
  audio = function(proto) {
    proto.withNoAudio = proto.noAudio = function() {
      this._currentOutput.audio.clear();
      this._currentOutput.audioFilters.clear();
      this._currentOutput.audio("-an");
      return this;
    };
    proto.withAudioCodec = proto.audioCodec = function(codec) {
      this._currentOutput.audio("-acodec", codec);
      return this;
    };
    proto.withAudioBitrate = proto.audioBitrate = function(bitrate) {
      this._currentOutput.audio("-b:a", ("" + bitrate).replace(/k?$/, "k"));
      return this;
    };
    proto.withAudioChannels = proto.audioChannels = function(channels) {
      this._currentOutput.audio("-ac", channels);
      return this;
    };
    proto.withAudioFrequency = proto.audioFrequency = function(freq) {
      this._currentOutput.audio("-ar", freq);
      return this;
    };
    proto.withAudioQuality = proto.audioQuality = function(quality) {
      this._currentOutput.audio("-aq", quality);
      return this;
    };
    proto.withAudioFilter = proto.withAudioFilters = proto.audioFilter = proto.audioFilters = function(filters) {
      if (arguments.length > 1) {
        filters = [].slice.call(arguments);
      }
      if (!Array.isArray(filters)) {
        filters = [filters];
      }
      this._currentOutput.audioFilters(utils2.makeFilterStrings(filters));
      return this;
    };
  };
  return audio;
}
var video;
var hasRequiredVideo;
function requireVideo() {
  if (hasRequiredVideo) return video;
  hasRequiredVideo = 1;
  var utils2 = requireUtils();
  video = function(proto) {
    proto.withNoVideo = proto.noVideo = function() {
      this._currentOutput.video.clear();
      this._currentOutput.videoFilters.clear();
      this._currentOutput.video("-vn");
      return this;
    };
    proto.withVideoCodec = proto.videoCodec = function(codec) {
      this._currentOutput.video("-vcodec", codec);
      return this;
    };
    proto.withVideoBitrate = proto.videoBitrate = function(bitrate, constant) {
      bitrate = ("" + bitrate).replace(/k?$/, "k");
      this._currentOutput.video("-b:v", bitrate);
      if (constant) {
        this._currentOutput.video(
          "-maxrate",
          bitrate,
          "-minrate",
          bitrate,
          "-bufsize",
          "3M"
        );
      }
      return this;
    };
    proto.withVideoFilter = proto.withVideoFilters = proto.videoFilter = proto.videoFilters = function(filters) {
      if (arguments.length > 1) {
        filters = [].slice.call(arguments);
      }
      if (!Array.isArray(filters)) {
        filters = [filters];
      }
      this._currentOutput.videoFilters(utils2.makeFilterStrings(filters));
      return this;
    };
    proto.withOutputFps = proto.withOutputFPS = proto.withFpsOutput = proto.withFPSOutput = proto.withFps = proto.withFPS = proto.outputFPS = proto.outputFps = proto.fpsOutput = proto.FPSOutput = proto.fps = proto.FPS = function(fps) {
      this._currentOutput.video("-r", fps);
      return this;
    };
    proto.takeFrames = proto.withFrames = proto.frames = function(frames) {
      this._currentOutput.video("-vframes", frames);
      return this;
    };
  };
  return video;
}
var videosize;
var hasRequiredVideosize;
function requireVideosize() {
  if (hasRequiredVideosize) return videosize;
  hasRequiredVideosize = 1;
  function getScalePadFilters(width, height, aspect, color) {
    return [
      /*
        In both cases, we first have to scale the input to match the requested size.
        When using computed width/height, we truncate them to multiples of 2
       */
      {
        filter: "scale",
        options: {
          w: "if(gt(a," + aspect + ")," + width + ",trunc(" + height + "*a/2)*2)",
          h: "if(lt(a," + aspect + ")," + height + ",trunc(" + width + "/a/2)*2)"
        }
      },
      /*
        Then we pad the scaled input to match the target size
        (here iw and ih refer to the padding input, i.e the scaled output)
       */
      {
        filter: "pad",
        options: {
          w: width,
          h: height,
          x: "if(gt(a," + aspect + "),0,(" + width + "-iw)/2)",
          y: "if(lt(a," + aspect + "),0,(" + height + "-ih)/2)",
          color
        }
      }
    ];
  }
  function createSizeFilters(output2, key, value) {
    var data = output2.sizeData = output2.sizeData || {};
    data[key] = value;
    if (!("size" in data)) {
      return [];
    }
    var fixedSize = data.size.match(/([0-9]+)x([0-9]+)/);
    var fixedWidth = data.size.match(/([0-9]+)x\?/);
    var fixedHeight = data.size.match(/\?x([0-9]+)/);
    var percentRatio = data.size.match(/\b([0-9]{1,3})%/);
    var width, height, aspect;
    if (percentRatio) {
      var ratio = Number(percentRatio[1]) / 100;
      return [{
        filter: "scale",
        options: {
          w: "trunc(iw*" + ratio + "/2)*2",
          h: "trunc(ih*" + ratio + "/2)*2"
        }
      }];
    } else if (fixedSize) {
      width = Math.round(Number(fixedSize[1]) / 2) * 2;
      height = Math.round(Number(fixedSize[2]) / 2) * 2;
      aspect = width / height;
      if (data.pad) {
        return getScalePadFilters(width, height, aspect, data.pad);
      } else {
        return [{ filter: "scale", options: { w: width, h: height } }];
      }
    } else if (fixedWidth || fixedHeight) {
      if ("aspect" in data) {
        width = fixedWidth ? fixedWidth[1] : Math.round(Number(fixedHeight[1]) * data.aspect);
        height = fixedHeight ? fixedHeight[1] : Math.round(Number(fixedWidth[1]) / data.aspect);
        width = Math.round(width / 2) * 2;
        height = Math.round(height / 2) * 2;
        if (data.pad) {
          return getScalePadFilters(width, height, data.aspect, data.pad);
        } else {
          return [{ filter: "scale", options: { w: width, h: height } }];
        }
      } else {
        if (fixedWidth) {
          return [{
            filter: "scale",
            options: {
              w: Math.round(Number(fixedWidth[1]) / 2) * 2,
              h: "trunc(ow/a/2)*2"
            }
          }];
        } else {
          return [{
            filter: "scale",
            options: {
              w: "trunc(oh*a/2)*2",
              h: Math.round(Number(fixedHeight[1]) / 2) * 2
            }
          }];
        }
      }
    } else {
      throw new Error("Invalid size specified: " + data.size);
    }
  }
  videosize = function(proto) {
    proto.keepPixelAspect = // Only for compatibility, this is not about keeping _pixel_ aspect ratio
    proto.keepDisplayAspect = proto.keepDisplayAspectRatio = proto.keepDAR = function() {
      return this.videoFilters([
        {
          filter: "scale",
          options: {
            w: "if(gt(sar,1),iw*sar,iw)",
            h: "if(lt(sar,1),ih/sar,ih)"
          }
        },
        {
          filter: "setsar",
          options: "1"
        }
      ]);
    };
    proto.withSize = proto.setSize = proto.size = function(size) {
      var filters = createSizeFilters(this._currentOutput, "size", size);
      this._currentOutput.sizeFilters.clear();
      this._currentOutput.sizeFilters(filters);
      return this;
    };
    proto.withAspect = proto.withAspectRatio = proto.setAspect = proto.setAspectRatio = proto.aspect = proto.aspectRatio = function(aspect) {
      var a = Number(aspect);
      if (isNaN(a)) {
        var match = aspect.match(/^(\d+):(\d+)$/);
        if (match) {
          a = Number(match[1]) / Number(match[2]);
        } else {
          throw new Error("Invalid aspect ratio: " + aspect);
        }
      }
      var filters = createSizeFilters(this._currentOutput, "aspect", a);
      this._currentOutput.sizeFilters.clear();
      this._currentOutput.sizeFilters(filters);
      return this;
    };
    proto.applyAutopadding = proto.applyAutoPadding = proto.applyAutopad = proto.applyAutoPad = proto.withAutopadding = proto.withAutoPadding = proto.withAutopad = proto.withAutoPad = proto.autoPad = proto.autopad = function(pad, color) {
      if (typeof pad === "string") {
        color = pad;
        pad = true;
      }
      if (typeof pad === "undefined") {
        pad = true;
      }
      var filters = createSizeFilters(this._currentOutput, "pad", pad ? color || "black" : false);
      this._currentOutput.sizeFilters.clear();
      this._currentOutput.sizeFilters(filters);
      return this;
    };
  };
  return videosize;
}
var output;
var hasRequiredOutput;
function requireOutput() {
  if (hasRequiredOutput) return output;
  hasRequiredOutput = 1;
  var utils2 = requireUtils();
  output = function(proto) {
    proto.addOutput = proto.output = function(target, pipeopts) {
      var isFile = false;
      if (!target && this._currentOutput) {
        throw new Error("Invalid output");
      }
      if (target && typeof target !== "string") {
        if (!("writable" in target) || !target.writable) {
          throw new Error("Invalid output");
        }
      } else if (typeof target === "string") {
        var protocol = target.match(/^([a-z]{2,}):/i);
        isFile = !protocol || protocol[0] === "file";
      }
      if (target && !("target" in this._currentOutput)) {
        this._currentOutput.target = target;
        this._currentOutput.isFile = isFile;
        this._currentOutput.pipeopts = pipeopts || {};
      } else {
        if (target && typeof target !== "string") {
          var hasOutputStream = this._outputs.some(function(output2) {
            return typeof output2.target !== "string";
          });
          if (hasOutputStream) {
            throw new Error("Only one output stream is supported");
          }
        }
        this._outputs.push(this._currentOutput = {
          target,
          isFile,
          flags: {},
          pipeopts: pipeopts || {}
        });
        var self2 = this;
        ["audio", "audioFilters", "video", "videoFilters", "sizeFilters", "options"].forEach(function(key) {
          self2._currentOutput[key] = utils2.args();
        });
        if (!target) {
          delete this._currentOutput.target;
        }
      }
      return this;
    };
    proto.seekOutput = proto.seek = function(seek) {
      this._currentOutput.options("-ss", seek);
      return this;
    };
    proto.withDuration = proto.setDuration = proto.duration = function(duration) {
      this._currentOutput.options("-t", duration);
      return this;
    };
    proto.toFormat = proto.withOutputFormat = proto.outputFormat = proto.format = function(format) {
      this._currentOutput.options("-f", format);
      return this;
    };
    proto.map = function(spec) {
      this._currentOutput.options("-map", spec.replace(utils2.streamRegexp, "[$1]"));
      return this;
    };
    proto.updateFlvMetadata = proto.flvmeta = function() {
      this._currentOutput.flags.flvmeta = true;
      return this;
    };
  };
  return output;
}
var custom;
var hasRequiredCustom;
function requireCustom() {
  if (hasRequiredCustom) return custom;
  hasRequiredCustom = 1;
  var utils2 = requireUtils();
  custom = function(proto) {
    proto.addInputOption = proto.addInputOptions = proto.withInputOption = proto.withInputOptions = proto.inputOption = proto.inputOptions = function(options) {
      if (!this._currentInput) {
        throw new Error("No input specified");
      }
      var doSplit = true;
      if (arguments.length > 1) {
        options = [].slice.call(arguments);
        doSplit = false;
      }
      if (!Array.isArray(options)) {
        options = [options];
      }
      this._currentInput.options(options.reduce(function(options2, option) {
        var split = String(option).split(" ");
        if (doSplit && split.length === 2) {
          options2.push(split[0], split[1]);
        } else {
          options2.push(option);
        }
        return options2;
      }, []));
      return this;
    };
    proto.addOutputOption = proto.addOutputOptions = proto.addOption = proto.addOptions = proto.withOutputOption = proto.withOutputOptions = proto.withOption = proto.withOptions = proto.outputOption = proto.outputOptions = function(options) {
      var doSplit = true;
      if (arguments.length > 1) {
        options = [].slice.call(arguments);
        doSplit = false;
      }
      if (!Array.isArray(options)) {
        options = [options];
      }
      this._currentOutput.options(options.reduce(function(options2, option) {
        var split = String(option).split(" ");
        if (doSplit && split.length === 2) {
          options2.push(split[0], split[1]);
        } else {
          options2.push(option);
        }
        return options2;
      }, []));
      return this;
    };
    proto.filterGraph = proto.complexFilter = function(spec, map2) {
      this._complexFilters.clear();
      if (!Array.isArray(spec)) {
        spec = [spec];
      }
      this._complexFilters("-filter_complex", utils2.makeFilterStrings(spec).join(";"));
      if (Array.isArray(map2)) {
        var self2 = this;
        map2.forEach(function(streamSpec) {
          self2._complexFilters("-map", streamSpec.replace(utils2.streamRegexp, "[$1]"));
        });
      } else if (typeof map2 === "string") {
        this._complexFilters("-map", map2.replace(utils2.streamRegexp, "[$1]"));
      }
      return this;
    };
  };
  return custom;
}
function commonjsRequire(path2) {
  throw new Error('Could not dynamically require "' + path2 + '". Please configure the dynamicRequireTargets or/and ignoreDynamicRequires option of @rollup/plugin-commonjs appropriately for this require call to work.');
}
var misc;
var hasRequiredMisc;
function requireMisc() {
  if (hasRequiredMisc) return misc;
  hasRequiredMisc = 1;
  var path$1 = path;
  misc = function(proto) {
    proto.usingPreset = proto.preset = function(preset) {
      if (typeof preset === "function") {
        preset(this);
      } else {
        try {
          var modulePath = path$1.join(this.options.presets, preset);
          var module = commonjsRequire(modulePath);
          if (typeof module.load === "function") {
            module.load(this);
          } else {
            throw new Error("preset " + modulePath + " has no load() function");
          }
        } catch (err) {
          throw new Error("preset " + modulePath + " could not be loaded: " + err.message);
        }
      }
      return this;
    };
  };
  return misc;
}
var async = { exports: {} };
var hasRequiredAsync;
function requireAsync() {
  if (hasRequiredAsync) return async.exports;
  hasRequiredAsync = 1;
  (function(module) {
    (function() {
      var async2 = {};
      var root, previous_async;
      root = this;
      if (root != null) {
        previous_async = root.async;
      }
      async2.noConflict = function() {
        root.async = previous_async;
        return async2;
      };
      function only_once(fn) {
        var called = false;
        return function() {
          if (called) throw new Error("Callback was already called.");
          called = true;
          fn.apply(root, arguments);
        };
      }
      var _each = function(arr, iterator) {
        if (arr.forEach) {
          return arr.forEach(iterator);
        }
        for (var i = 0; i < arr.length; i += 1) {
          iterator(arr[i], i, arr);
        }
      };
      var _map = function(arr, iterator) {
        if (arr.map) {
          return arr.map(iterator);
        }
        var results = [];
        _each(arr, function(x, i, a) {
          results.push(iterator(x, i, a));
        });
        return results;
      };
      var _reduce = function(arr, iterator, memo) {
        if (arr.reduce) {
          return arr.reduce(iterator, memo);
        }
        _each(arr, function(x, i, a) {
          memo = iterator(memo, x, i, a);
        });
        return memo;
      };
      var _keys = function(obj) {
        if (Object.keys) {
          return Object.keys(obj);
        }
        var keys = [];
        for (var k in obj) {
          if (obj.hasOwnProperty(k)) {
            keys.push(k);
          }
        }
        return keys;
      };
      if (typeof process === "undefined" || !process.nextTick) {
        if (typeof setImmediate === "function") {
          async2.nextTick = function(fn) {
            setImmediate(fn);
          };
          async2.setImmediate = async2.nextTick;
        } else {
          async2.nextTick = function(fn) {
            setTimeout(fn, 0);
          };
          async2.setImmediate = async2.nextTick;
        }
      } else {
        async2.nextTick = process.nextTick;
        if (typeof setImmediate !== "undefined") {
          async2.setImmediate = function(fn) {
            setImmediate(fn);
          };
        } else {
          async2.setImmediate = async2.nextTick;
        }
      }
      async2.each = function(arr, iterator, callback) {
        callback = callback || function() {
        };
        if (!arr.length) {
          return callback();
        }
        var completed = 0;
        _each(arr, function(x) {
          iterator(x, only_once(function(err) {
            if (err) {
              callback(err);
              callback = function() {
              };
            } else {
              completed += 1;
              if (completed >= arr.length) {
                callback(null);
              }
            }
          }));
        });
      };
      async2.forEach = async2.each;
      async2.eachSeries = function(arr, iterator, callback) {
        callback = callback || function() {
        };
        if (!arr.length) {
          return callback();
        }
        var completed = 0;
        var iterate = function() {
          iterator(arr[completed], function(err) {
            if (err) {
              callback(err);
              callback = function() {
              };
            } else {
              completed += 1;
              if (completed >= arr.length) {
                callback(null);
              } else {
                iterate();
              }
            }
          });
        };
        iterate();
      };
      async2.forEachSeries = async2.eachSeries;
      async2.eachLimit = function(arr, limit, iterator, callback) {
        var fn = _eachLimit(limit);
        fn.apply(null, [arr, iterator, callback]);
      };
      async2.forEachLimit = async2.eachLimit;
      var _eachLimit = function(limit) {
        return function(arr, iterator, callback) {
          callback = callback || function() {
          };
          if (!arr.length || limit <= 0) {
            return callback();
          }
          var completed = 0;
          var started = 0;
          var running = 0;
          (function replenish() {
            if (completed >= arr.length) {
              return callback();
            }
            while (running < limit && started < arr.length) {
              started += 1;
              running += 1;
              iterator(arr[started - 1], function(err) {
                if (err) {
                  callback(err);
                  callback = function() {
                  };
                } else {
                  completed += 1;
                  running -= 1;
                  if (completed >= arr.length) {
                    callback();
                  } else {
                    replenish();
                  }
                }
              });
            }
          })();
        };
      };
      var doParallel = function(fn) {
        return function() {
          var args = Array.prototype.slice.call(arguments);
          return fn.apply(null, [async2.each].concat(args));
        };
      };
      var doParallelLimit = function(limit, fn) {
        return function() {
          var args = Array.prototype.slice.call(arguments);
          return fn.apply(null, [_eachLimit(limit)].concat(args));
        };
      };
      var doSeries = function(fn) {
        return function() {
          var args = Array.prototype.slice.call(arguments);
          return fn.apply(null, [async2.eachSeries].concat(args));
        };
      };
      var _asyncMap = function(eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function(x, i) {
          return { index: i, value: x };
        });
        eachfn(arr, function(x, callback2) {
          iterator(x.value, function(err, v) {
            results[x.index] = v;
            callback2(err);
          });
        }, function(err) {
          callback(err, results);
        });
      };
      async2.map = doParallel(_asyncMap);
      async2.mapSeries = doSeries(_asyncMap);
      async2.mapLimit = function(arr, limit, iterator, callback) {
        return _mapLimit(limit)(arr, iterator, callback);
      };
      var _mapLimit = function(limit) {
        return doParallelLimit(limit, _asyncMap);
      };
      async2.reduce = function(arr, memo, iterator, callback) {
        async2.eachSeries(arr, function(x, callback2) {
          iterator(memo, x, function(err, v) {
            memo = v;
            callback2(err);
          });
        }, function(err) {
          callback(err, memo);
        });
      };
      async2.inject = async2.reduce;
      async2.foldl = async2.reduce;
      async2.reduceRight = function(arr, memo, iterator, callback) {
        var reversed = _map(arr, function(x) {
          return x;
        }).reverse();
        async2.reduce(reversed, memo, iterator, callback);
      };
      async2.foldr = async2.reduceRight;
      var _filter = function(eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function(x, i) {
          return { index: i, value: x };
        });
        eachfn(arr, function(x, callback2) {
          iterator(x.value, function(v) {
            if (v) {
              results.push(x);
            }
            callback2();
          });
        }, function(err) {
          callback(_map(results.sort(function(a, b) {
            return a.index - b.index;
          }), function(x) {
            return x.value;
          }));
        });
      };
      async2.filter = doParallel(_filter);
      async2.filterSeries = doSeries(_filter);
      async2.select = async2.filter;
      async2.selectSeries = async2.filterSeries;
      var _reject = function(eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function(x, i) {
          return { index: i, value: x };
        });
        eachfn(arr, function(x, callback2) {
          iterator(x.value, function(v) {
            if (!v) {
              results.push(x);
            }
            callback2();
          });
        }, function(err) {
          callback(_map(results.sort(function(a, b) {
            return a.index - b.index;
          }), function(x) {
            return x.value;
          }));
        });
      };
      async2.reject = doParallel(_reject);
      async2.rejectSeries = doSeries(_reject);
      var _detect = function(eachfn, arr, iterator, main_callback) {
        eachfn(arr, function(x, callback) {
          iterator(x, function(result) {
            if (result) {
              main_callback(x);
              main_callback = function() {
              };
            } else {
              callback();
            }
          });
        }, function(err) {
          main_callback();
        });
      };
      async2.detect = doParallel(_detect);
      async2.detectSeries = doSeries(_detect);
      async2.some = function(arr, iterator, main_callback) {
        async2.each(arr, function(x, callback) {
          iterator(x, function(v) {
            if (v) {
              main_callback(true);
              main_callback = function() {
              };
            }
            callback();
          });
        }, function(err) {
          main_callback(false);
        });
      };
      async2.any = async2.some;
      async2.every = function(arr, iterator, main_callback) {
        async2.each(arr, function(x, callback) {
          iterator(x, function(v) {
            if (!v) {
              main_callback(false);
              main_callback = function() {
              };
            }
            callback();
          });
        }, function(err) {
          main_callback(true);
        });
      };
      async2.all = async2.every;
      async2.sortBy = function(arr, iterator, callback) {
        async2.map(arr, function(x, callback2) {
          iterator(x, function(err, criteria) {
            if (err) {
              callback2(err);
            } else {
              callback2(null, { value: x, criteria });
            }
          });
        }, function(err, results) {
          if (err) {
            return callback(err);
          } else {
            var fn = function(left, right) {
              var a = left.criteria, b = right.criteria;
              return a < b ? -1 : a > b ? 1 : 0;
            };
            callback(null, _map(results.sort(fn), function(x) {
              return x.value;
            }));
          }
        });
      };
      async2.auto = function(tasks, callback) {
        callback = callback || function() {
        };
        var keys = _keys(tasks);
        if (!keys.length) {
          return callback(null);
        }
        var results = {};
        var listeners = [];
        var addListener = function(fn) {
          listeners.unshift(fn);
        };
        var removeListener = function(fn) {
          for (var i = 0; i < listeners.length; i += 1) {
            if (listeners[i] === fn) {
              listeners.splice(i, 1);
              return;
            }
          }
        };
        var taskComplete = function() {
          _each(listeners.slice(0), function(fn) {
            fn();
          });
        };
        addListener(function() {
          if (_keys(results).length === keys.length) {
            callback(null, results);
            callback = function() {
            };
          }
        });
        _each(keys, function(k) {
          var task = tasks[k] instanceof Function ? [tasks[k]] : tasks[k];
          var taskCallback = function(err) {
            var args = Array.prototype.slice.call(arguments, 1);
            if (args.length <= 1) {
              args = args[0];
            }
            if (err) {
              var safeResults = {};
              _each(_keys(results), function(rkey) {
                safeResults[rkey] = results[rkey];
              });
              safeResults[k] = args;
              callback(err, safeResults);
              callback = function() {
              };
            } else {
              results[k] = args;
              async2.setImmediate(taskComplete);
            }
          };
          var requires = task.slice(0, Math.abs(task.length - 1)) || [];
          var ready = function() {
            return _reduce(requires, function(a, x) {
              return a && results.hasOwnProperty(x);
            }, true) && !results.hasOwnProperty(k);
          };
          if (ready()) {
            task[task.length - 1](taskCallback, results);
          } else {
            var listener = function() {
              if (ready()) {
                removeListener(listener);
                task[task.length - 1](taskCallback, results);
              }
            };
            addListener(listener);
          }
        });
      };
      async2.waterfall = function(tasks, callback) {
        callback = callback || function() {
        };
        if (tasks.constructor !== Array) {
          var err = new Error("First argument to waterfall must be an array of functions");
          return callback(err);
        }
        if (!tasks.length) {
          return callback();
        }
        var wrapIterator = function(iterator) {
          return function(err2) {
            if (err2) {
              callback.apply(null, arguments);
              callback = function() {
              };
            } else {
              var args = Array.prototype.slice.call(arguments, 1);
              var next = iterator.next();
              if (next) {
                args.push(wrapIterator(next));
              } else {
                args.push(callback);
              }
              async2.setImmediate(function() {
                iterator.apply(null, args);
              });
            }
          };
        };
        wrapIterator(async2.iterator(tasks))();
      };
      var _parallel = function(eachfn, tasks, callback) {
        callback = callback || function() {
        };
        if (tasks.constructor === Array) {
          eachfn.map(tasks, function(fn, callback2) {
            if (fn) {
              fn(function(err) {
                var args = Array.prototype.slice.call(arguments, 1);
                if (args.length <= 1) {
                  args = args[0];
                }
                callback2.call(null, err, args);
              });
            }
          }, callback);
        } else {
          var results = {};
          eachfn.each(_keys(tasks), function(k, callback2) {
            tasks[k](function(err) {
              var args = Array.prototype.slice.call(arguments, 1);
              if (args.length <= 1) {
                args = args[0];
              }
              results[k] = args;
              callback2(err);
            });
          }, function(err) {
            callback(err, results);
          });
        }
      };
      async2.parallel = function(tasks, callback) {
        _parallel({ map: async2.map, each: async2.each }, tasks, callback);
      };
      async2.parallelLimit = function(tasks, limit, callback) {
        _parallel({ map: _mapLimit(limit), each: _eachLimit(limit) }, tasks, callback);
      };
      async2.series = function(tasks, callback) {
        callback = callback || function() {
        };
        if (tasks.constructor === Array) {
          async2.mapSeries(tasks, function(fn, callback2) {
            if (fn) {
              fn(function(err) {
                var args = Array.prototype.slice.call(arguments, 1);
                if (args.length <= 1) {
                  args = args[0];
                }
                callback2.call(null, err, args);
              });
            }
          }, callback);
        } else {
          var results = {};
          async2.eachSeries(_keys(tasks), function(k, callback2) {
            tasks[k](function(err) {
              var args = Array.prototype.slice.call(arguments, 1);
              if (args.length <= 1) {
                args = args[0];
              }
              results[k] = args;
              callback2(err);
            });
          }, function(err) {
            callback(err, results);
          });
        }
      };
      async2.iterator = function(tasks) {
        var makeCallback = function(index) {
          var fn = function() {
            if (tasks.length) {
              tasks[index].apply(null, arguments);
            }
            return fn.next();
          };
          fn.next = function() {
            return index < tasks.length - 1 ? makeCallback(index + 1) : null;
          };
          return fn;
        };
        return makeCallback(0);
      };
      async2.apply = function(fn) {
        var args = Array.prototype.slice.call(arguments, 1);
        return function() {
          return fn.apply(
            null,
            args.concat(Array.prototype.slice.call(arguments))
          );
        };
      };
      var _concat = function(eachfn, arr, fn, callback) {
        var r = [];
        eachfn(arr, function(x, cb) {
          fn(x, function(err, y) {
            r = r.concat(y || []);
            cb(err);
          });
        }, function(err) {
          callback(err, r);
        });
      };
      async2.concat = doParallel(_concat);
      async2.concatSeries = doSeries(_concat);
      async2.whilst = function(test, iterator, callback) {
        if (test()) {
          iterator(function(err) {
            if (err) {
              return callback(err);
            }
            async2.whilst(test, iterator, callback);
          });
        } else {
          callback();
        }
      };
      async2.doWhilst = function(iterator, test, callback) {
        iterator(function(err) {
          if (err) {
            return callback(err);
          }
          if (test()) {
            async2.doWhilst(iterator, test, callback);
          } else {
            callback();
          }
        });
      };
      async2.until = function(test, iterator, callback) {
        if (!test()) {
          iterator(function(err) {
            if (err) {
              return callback(err);
            }
            async2.until(test, iterator, callback);
          });
        } else {
          callback();
        }
      };
      async2.doUntil = function(iterator, test, callback) {
        iterator(function(err) {
          if (err) {
            return callback(err);
          }
          if (!test()) {
            async2.doUntil(iterator, test, callback);
          } else {
            callback();
          }
        });
      };
      async2.queue = function(worker, concurrency) {
        if (concurrency === void 0) {
          concurrency = 1;
        }
        function _insert(q2, data, pos, callback) {
          if (data.constructor !== Array) {
            data = [data];
          }
          _each(data, function(task) {
            var item = {
              data: task,
              callback: typeof callback === "function" ? callback : null
            };
            if (pos) {
              q2.tasks.unshift(item);
            } else {
              q2.tasks.push(item);
            }
            if (q2.saturated && q2.tasks.length === concurrency) {
              q2.saturated();
            }
            async2.setImmediate(q2.process);
          });
        }
        var workers = 0;
        var q = {
          tasks: [],
          concurrency,
          saturated: null,
          empty: null,
          drain: null,
          push: function(data, callback) {
            _insert(q, data, false, callback);
          },
          unshift: function(data, callback) {
            _insert(q, data, true, callback);
          },
          process: function() {
            if (workers < q.concurrency && q.tasks.length) {
              var task = q.tasks.shift();
              if (q.empty && q.tasks.length === 0) {
                q.empty();
              }
              workers += 1;
              var next = function() {
                workers -= 1;
                if (task.callback) {
                  task.callback.apply(task, arguments);
                }
                if (q.drain && q.tasks.length + workers === 0) {
                  q.drain();
                }
                q.process();
              };
              var cb = only_once(next);
              worker(task.data, cb);
            }
          },
          length: function() {
            return q.tasks.length;
          },
          running: function() {
            return workers;
          }
        };
        return q;
      };
      async2.cargo = function(worker, payload) {
        var working = false, tasks = [];
        var cargo = {
          tasks,
          payload,
          saturated: null,
          empty: null,
          drain: null,
          push: function(data, callback) {
            if (data.constructor !== Array) {
              data = [data];
            }
            _each(data, function(task) {
              tasks.push({
                data: task,
                callback: typeof callback === "function" ? callback : null
              });
              if (cargo.saturated && tasks.length === payload) {
                cargo.saturated();
              }
            });
            async2.setImmediate(cargo.process);
          },
          process: function process2() {
            if (working) return;
            if (tasks.length === 0) {
              if (cargo.drain) cargo.drain();
              return;
            }
            var ts = typeof payload === "number" ? tasks.splice(0, payload) : tasks.splice(0);
            var ds = _map(ts, function(task) {
              return task.data;
            });
            if (cargo.empty) cargo.empty();
            working = true;
            worker(ds, function() {
              working = false;
              var args = arguments;
              _each(ts, function(data) {
                if (data.callback) {
                  data.callback.apply(null, args);
                }
              });
              process2();
            });
          },
          length: function() {
            return tasks.length;
          },
          running: function() {
            return working;
          }
        };
        return cargo;
      };
      var _console_fn = function(name) {
        return function(fn) {
          var args = Array.prototype.slice.call(arguments, 1);
          fn.apply(null, args.concat([function(err) {
            var args2 = Array.prototype.slice.call(arguments, 1);
            if (typeof console !== "undefined") {
              if (err) {
                if (console.error) {
                  console.error(err);
                }
              } else if (console[name]) {
                _each(args2, function(x) {
                  console[name](x);
                });
              }
            }
          }]));
        };
      };
      async2.log = _console_fn("log");
      async2.dir = _console_fn("dir");
      async2.memoize = function(fn, hasher) {
        var memo = {};
        var queues = {};
        hasher = hasher || function(x) {
          return x;
        };
        var memoized = function() {
          var args = Array.prototype.slice.call(arguments);
          var callback = args.pop();
          var key = hasher.apply(null, args);
          if (key in memo) {
            callback.apply(null, memo[key]);
          } else if (key in queues) {
            queues[key].push(callback);
          } else {
            queues[key] = [callback];
            fn.apply(null, args.concat([function() {
              memo[key] = arguments;
              var q = queues[key];
              delete queues[key];
              for (var i = 0, l = q.length; i < l; i++) {
                q[i].apply(null, arguments);
              }
            }]));
          }
        };
        memoized.memo = memo;
        memoized.unmemoized = fn;
        return memoized;
      };
      async2.unmemoize = function(fn) {
        return function() {
          return (fn.unmemoized || fn).apply(null, arguments);
        };
      };
      async2.times = function(count, iterator, callback) {
        var counter = [];
        for (var i = 0; i < count; i++) {
          counter.push(i);
        }
        return async2.map(counter, iterator, callback);
      };
      async2.timesSeries = function(count, iterator, callback) {
        var counter = [];
        for (var i = 0; i < count; i++) {
          counter.push(i);
        }
        return async2.mapSeries(counter, iterator, callback);
      };
      async2.compose = function() {
        var fns = Array.prototype.reverse.call(arguments);
        return function() {
          var that = this;
          var args = Array.prototype.slice.call(arguments);
          var callback = args.pop();
          async2.reduce(
            fns,
            args,
            function(newargs, fn, cb) {
              fn.apply(that, newargs.concat([function() {
                var err = arguments[0];
                var nextargs = Array.prototype.slice.call(arguments, 1);
                cb(err, nextargs);
              }]));
            },
            function(err, results) {
              callback.apply(that, [err].concat(results));
            }
          );
        };
      };
      var _applyEach = function(eachfn, fns) {
        var go = function() {
          var that = this;
          var args2 = Array.prototype.slice.call(arguments);
          var callback = args2.pop();
          return eachfn(
            fns,
            function(fn, cb) {
              fn.apply(that, args2.concat([cb]));
            },
            callback
          );
        };
        if (arguments.length > 2) {
          var args = Array.prototype.slice.call(arguments, 2);
          return go.apply(this, args);
        } else {
          return go;
        }
      };
      async2.applyEach = doParallel(_applyEach);
      async2.applyEachSeries = doSeries(_applyEach);
      async2.forever = function(fn, callback) {
        function next(err) {
          if (err) {
            if (callback) {
              return callback(err);
            }
            throw err;
          }
          fn(next);
        }
        next();
      };
      if (module.exports) {
        module.exports = async2;
      } else {
        root.async = async2;
      }
    })();
  })(async);
  return async.exports;
}
var processor;
var hasRequiredProcessor;
function requireProcessor() {
  if (hasRequiredProcessor) return processor;
  hasRequiredProcessor = 1;
  var spawn = require$$0$4.spawn;
  var async2 = requireAsync();
  var utils2 = requireUtils();
  function runFfprobe(command) {
    const inputProbeIndex = 0;
    if (command._inputs[inputProbeIndex].isStream) {
      return;
    }
    command.ffprobe(inputProbeIndex, function(err, data) {
      command._ffprobeData = data;
    });
  }
  processor = function(proto) {
    proto._spawnFfmpeg = function(args, options, processCB, endCB) {
      if (typeof options === "function") {
        endCB = processCB;
        processCB = options;
        options = {};
      }
      if (typeof endCB === "undefined") {
        endCB = processCB;
        processCB = function() {
        };
      }
      var maxLines = "stdoutLines" in options ? options.stdoutLines : this.options.stdoutLines;
      this._getFfmpegPath(function(err, command) {
        if (err) {
          return endCB(err);
        } else if (!command || command.length === 0) {
          return endCB(new Error("Cannot find ffmpeg"));
        }
        if (options.niceness && options.niceness !== 0 && !utils2.isWindows) {
          args.unshift("-n", options.niceness, command);
          command = "nice";
        }
        var stdoutRing = utils2.linesRing(maxLines);
        var stdoutClosed = false;
        var stderrRing = utils2.linesRing(maxLines);
        var stderrClosed = false;
        var ffmpegProc = spawn(command, args, options);
        if (ffmpegProc.stderr) {
          ffmpegProc.stderr.setEncoding("utf8");
        }
        ffmpegProc.on("error", function(err2) {
          endCB(err2);
        });
        var exitError = null;
        function handleExit(err2) {
          if (err2) {
            exitError = err2;
          }
          if (processExited && (stdoutClosed || !options.captureStdout) && stderrClosed) {
            endCB(exitError, stdoutRing, stderrRing);
          }
        }
        var processExited = false;
        ffmpegProc.on("exit", function(code, signal) {
          processExited = true;
          if (signal) {
            handleExit(new Error("ffmpeg was killed with signal " + signal));
          } else if (code) {
            handleExit(new Error("ffmpeg exited with code " + code));
          } else {
            handleExit();
          }
        });
        if (options.captureStdout) {
          ffmpegProc.stdout.on("data", function(data) {
            stdoutRing.append(data);
          });
          ffmpegProc.stdout.on("close", function() {
            stdoutRing.close();
            stdoutClosed = true;
            handleExit();
          });
        }
        ffmpegProc.stderr.on("data", function(data) {
          stderrRing.append(data);
        });
        ffmpegProc.stderr.on("close", function() {
          stderrRing.close();
          stderrClosed = true;
          handleExit();
        });
        processCB(ffmpegProc, stdoutRing, stderrRing);
      });
    };
    proto._getArguments = function() {
      var complexFilters = this._complexFilters.get();
      var fileOutput = this._outputs.some(function(output2) {
        return output2.isFile;
      });
      return [].concat(
        // Inputs and input options
        this._inputs.reduce(function(args, input) {
          var source = typeof input.source === "string" ? input.source : "pipe:0";
          return args.concat(
            input.options.get(),
            ["-i", source]
          );
        }, []),
        // Global options
        this._global.get(),
        // Overwrite if we have file outputs
        fileOutput ? ["-y"] : [],
        // Complex filters
        complexFilters,
        // Outputs, filters and output options
        this._outputs.reduce(function(args, output2) {
          var sizeFilters = utils2.makeFilterStrings(output2.sizeFilters.get());
          var audioFilters = output2.audioFilters.get();
          var videoFilters = output2.videoFilters.get().concat(sizeFilters);
          var outputArg;
          if (!output2.target) {
            outputArg = [];
          } else if (typeof output2.target === "string") {
            outputArg = [output2.target];
          } else {
            outputArg = ["pipe:1"];
          }
          return args.concat(
            output2.audio.get(),
            audioFilters.length ? ["-filter:a", audioFilters.join(",")] : [],
            output2.video.get(),
            videoFilters.length ? ["-filter:v", videoFilters.join(",")] : [],
            output2.options.get(),
            outputArg
          );
        }, [])
      );
    };
    proto._prepare = function(callback, readMetadata) {
      var self2 = this;
      async2.waterfall([
        // Check codecs and formats
        function(cb) {
          self2._checkCapabilities(cb);
        },
        // Read metadata if required
        function(cb) {
          if (!readMetadata) {
            return cb();
          }
          self2.ffprobe(0, function(err, data) {
            if (!err) {
              self2._ffprobeData = data;
            }
            cb();
          });
        },
        // Check for flvtool2/flvmeta if necessary
        function(cb) {
          var flvmeta = self2._outputs.some(function(output2) {
            if (output2.flags.flvmeta && !output2.isFile) {
              self2.logger.warn("Updating flv metadata is only supported for files");
              output2.flags.flvmeta = false;
            }
            return output2.flags.flvmeta;
          });
          if (flvmeta) {
            self2._getFlvtoolPath(function(err) {
              cb(err);
            });
          } else {
            cb();
          }
        },
        // Build argument list
        function(cb) {
          var args;
          try {
            args = self2._getArguments();
          } catch (e) {
            return cb(e);
          }
          cb(null, args);
        },
        // Add "-strict experimental" option where needed
        function(args, cb) {
          self2.availableEncoders(function(err, encoders) {
            for (var i = 0; i < args.length; i++) {
              if (args[i] === "-acodec" || args[i] === "-vcodec") {
                i++;
                if (args[i] in encoders && encoders[args[i]].experimental) {
                  args.splice(i + 1, 0, "-strict", "experimental");
                  i += 2;
                }
              }
            }
            cb(null, args);
          });
        }
      ], callback);
      if (!readMetadata) {
        if (this.listeners("progress").length > 0) {
          runFfprobe(this);
        } else {
          this.once("newListener", function(event) {
            if (event === "progress") {
              runFfprobe(this);
            }
          });
        }
      }
    };
    proto.exec = proto.execute = proto.run = function() {
      var self2 = this;
      var outputPresent = this._outputs.some(function(output2) {
        return "target" in output2;
      });
      if (!outputPresent) {
        throw new Error("No output specified");
      }
      var outputStream = this._outputs.filter(function(output2) {
        return typeof output2.target !== "string";
      })[0];
      var inputStream = this._inputs.filter(function(input) {
        return typeof input.source !== "string";
      })[0];
      var ended = false;
      function emitEnd(err, stdout, stderr) {
        if (!ended) {
          ended = true;
          if (err) {
            self2.emit("error", err, stdout, stderr);
          } else {
            self2.emit("end", stdout, stderr);
          }
        }
      }
      self2._prepare(function(err, args) {
        if (err) {
          return emitEnd(err);
        }
        self2._spawnFfmpeg(
          args,
          {
            captureStdout: !outputStream,
            niceness: self2.options.niceness,
            cwd: self2.options.cwd,
            windowsHide: true
          },
          function processCB(ffmpegProc, stdoutRing, stderrRing) {
            self2.ffmpegProc = ffmpegProc;
            self2.emit("start", "ffmpeg " + args.join(" "));
            if (inputStream) {
              inputStream.source.on("error", function(err2) {
                var reportingErr = new Error("Input stream error: " + err2.message);
                reportingErr.inputStreamError = err2;
                emitEnd(reportingErr);
                ffmpegProc.kill();
              });
              inputStream.source.resume();
              inputStream.source.pipe(ffmpegProc.stdin);
              ffmpegProc.stdin.on("error", function() {
              });
            }
            if (self2.options.timeout) {
              self2.processTimer = setTimeout(function() {
                var msg = "process ran into a timeout (" + self2.options.timeout + "s)";
                emitEnd(new Error(msg), stdoutRing.get(), stderrRing.get());
                ffmpegProc.kill();
              }, self2.options.timeout * 1e3);
            }
            if (outputStream) {
              ffmpegProc.stdout.pipe(outputStream.target, outputStream.pipeopts);
              outputStream.target.on("close", function() {
                self2.logger.debug("Output stream closed, scheduling kill for ffmpeg process");
                setTimeout(function() {
                  emitEnd(new Error("Output stream closed"));
                  ffmpegProc.kill();
                }, 20);
              });
              outputStream.target.on("error", function(err2) {
                self2.logger.debug("Output stream error, killing ffmpeg process");
                var reportingErr = new Error("Output stream error: " + err2.message);
                reportingErr.outputStreamError = err2;
                emitEnd(reportingErr, stdoutRing.get(), stderrRing.get());
                ffmpegProc.kill("SIGKILL");
              });
            }
            if (stderrRing) {
              if (self2.listeners("stderr").length) {
                stderrRing.callback(function(line) {
                  self2.emit("stderr", line);
                });
              }
              if (self2.listeners("codecData").length) {
                var codecDataSent = false;
                var codecObject = {};
                stderrRing.callback(function(line) {
                  if (!codecDataSent)
                    codecDataSent = utils2.extractCodecData(self2, line, codecObject);
                });
              }
              if (self2.listeners("progress").length) {
                stderrRing.callback(function(line) {
                  utils2.extractProgress(self2, line);
                });
              }
            }
          },
          function endCB(err2, stdoutRing, stderrRing) {
            clearTimeout(self2.processTimer);
            delete self2.ffmpegProc;
            if (err2) {
              if (err2.message.match(/ffmpeg exited with code/)) {
                err2.message += ": " + utils2.extractError(stderrRing.get());
              }
              emitEnd(err2, stdoutRing.get(), stderrRing.get());
            } else {
              var flvmeta = self2._outputs.filter(function(output2) {
                return output2.flags.flvmeta;
              });
              if (flvmeta.length) {
                self2._getFlvtoolPath(function(err3, flvtool) {
                  if (err3) {
                    return emitEnd(err3);
                  }
                  async2.each(
                    flvmeta,
                    function(output2, cb) {
                      spawn(flvtool, ["-U", output2.target], { windowsHide: true }).on("error", function(err4) {
                        cb(new Error("Error running " + flvtool + " on " + output2.target + ": " + err4.message));
                      }).on("exit", function(code, signal) {
                        if (code !== 0 || signal) {
                          cb(
                            new Error(flvtool + " " + (signal ? "received signal " + signal : "exited with code " + code)) + " when running on " + output2.target
                          );
                        } else {
                          cb();
                        }
                      });
                    },
                    function(err4) {
                      if (err4) {
                        emitEnd(err4);
                      } else {
                        emitEnd(null, stdoutRing.get(), stderrRing.get());
                      }
                    }
                  );
                });
              } else {
                emitEnd(null, stdoutRing.get(), stderrRing.get());
              }
            }
          }
        );
      });
      return this;
    };
    proto.renice = function(niceness) {
      if (!utils2.isWindows) {
        niceness = niceness || 0;
        if (niceness < -20 || niceness > 20) {
          this.logger.warn("Invalid niceness value: " + niceness + ", must be between -20 and 20");
        }
        niceness = Math.min(20, Math.max(-20, niceness));
        this.options.niceness = niceness;
        if (this.ffmpegProc) {
          var logger = this.logger;
          var pid = this.ffmpegProc.pid;
          var renice = spawn("renice", [niceness, "-p", pid], { windowsHide: true });
          renice.on("error", function(err) {
            logger.warn("could not renice process " + pid + ": " + err.message);
          });
          renice.on("exit", function(code, signal) {
            if (signal) {
              logger.warn("could not renice process " + pid + ": renice was killed by signal " + signal);
            } else if (code) {
              logger.warn("could not renice process " + pid + ": renice exited with " + code);
            } else {
              logger.info("successfully reniced process " + pid + " to " + niceness + " niceness");
            }
          });
        }
      }
      return this;
    };
    proto.kill = function(signal) {
      if (!this.ffmpegProc) {
        this.logger.warn("No running ffmpeg process, cannot send signal");
      } else {
        this.ffmpegProc.kill(signal || "SIGKILL");
      }
      return this;
    };
  };
  return processor;
}
var capabilities;
var hasRequiredCapabilities;
function requireCapabilities() {
  if (hasRequiredCapabilities) return capabilities;
  hasRequiredCapabilities = 1;
  var fs2 = fs$1;
  var path$1 = path;
  var async2 = requireAsync();
  var utils2 = requireUtils();
  var avCodecRegexp = /^\s*([D ])([E ])([VAS])([S ])([D ])([T ]) ([^ ]+) +(.*)$/;
  var ffCodecRegexp = /^\s*([D\.])([E\.])([VAS])([I\.])([L\.])([S\.]) ([^ ]+) +(.*)$/;
  var ffEncodersRegexp = /\(encoders:([^\)]+)\)/;
  var ffDecodersRegexp = /\(decoders:([^\)]+)\)/;
  var encodersRegexp = /^\s*([VAS\.])([F\.])([S\.])([X\.])([B\.])([D\.]) ([^ ]+) +(.*)$/;
  var formatRegexp = /^\s*([D ])([E ])\s+([^ ]+)\s+(.*)$/;
  var lineBreakRegexp = /\r\n|\r|\n/;
  var filterRegexp = /^(?: [T\.][S\.][C\.] )?([^ ]+) +(AA?|VV?|\|)->(AA?|VV?|\|) +(.*)$/;
  var cache = {};
  capabilities = function(proto) {
    proto.setFfmpegPath = function(ffmpegPath) {
      cache.ffmpegPath = ffmpegPath;
      return this;
    };
    proto.setFfprobePath = function(ffprobePath) {
      cache.ffprobePath = ffprobePath;
      return this;
    };
    proto.setFlvtoolPath = function(flvtool) {
      cache.flvtoolPath = flvtool;
      return this;
    };
    proto._forgetPaths = function() {
      delete cache.ffmpegPath;
      delete cache.ffprobePath;
      delete cache.flvtoolPath;
    };
    proto._getFfmpegPath = function(callback) {
      if ("ffmpegPath" in cache) {
        return callback(null, cache.ffmpegPath);
      }
      async2.waterfall([
        // Try FFMPEG_PATH
        function(cb) {
          if (process.env.FFMPEG_PATH) {
            fs2.exists(process.env.FFMPEG_PATH, function(exists) {
              if (exists) {
                cb(null, process.env.FFMPEG_PATH);
              } else {
                cb(null, "");
              }
            });
          } else {
            cb(null, "");
          }
        },
        // Search in the PATH
        function(ffmpeg2, cb) {
          if (ffmpeg2.length) {
            return cb(null, ffmpeg2);
          }
          utils2.which("ffmpeg", function(err, ffmpeg22) {
            cb(err, ffmpeg22);
          });
        }
      ], function(err, ffmpeg2) {
        if (err) {
          callback(err);
        } else {
          callback(null, cache.ffmpegPath = ffmpeg2 || "");
        }
      });
    };
    proto._getFfprobePath = function(callback) {
      var self2 = this;
      if ("ffprobePath" in cache) {
        return callback(null, cache.ffprobePath);
      }
      async2.waterfall([
        // Try FFPROBE_PATH
        function(cb) {
          if (process.env.FFPROBE_PATH) {
            fs2.exists(process.env.FFPROBE_PATH, function(exists) {
              cb(null, exists ? process.env.FFPROBE_PATH : "");
            });
          } else {
            cb(null, "");
          }
        },
        // Search in the PATH
        function(ffprobe2, cb) {
          if (ffprobe2.length) {
            return cb(null, ffprobe2);
          }
          utils2.which("ffprobe", function(err, ffprobe22) {
            cb(err, ffprobe22);
          });
        },
        // Search in the same directory as ffmpeg
        function(ffprobe2, cb) {
          if (ffprobe2.length) {
            return cb(null, ffprobe2);
          }
          self2._getFfmpegPath(function(err, ffmpeg2) {
            if (err) {
              cb(err);
            } else if (ffmpeg2.length) {
              var name = utils2.isWindows ? "ffprobe.exe" : "ffprobe";
              var ffprobe22 = path$1.join(path$1.dirname(ffmpeg2), name);
              fs2.exists(ffprobe22, function(exists) {
                cb(null, exists ? ffprobe22 : "");
              });
            } else {
              cb(null, "");
            }
          });
        }
      ], function(err, ffprobe2) {
        if (err) {
          callback(err);
        } else {
          callback(null, cache.ffprobePath = ffprobe2 || "");
        }
      });
    };
    proto._getFlvtoolPath = function(callback) {
      if ("flvtoolPath" in cache) {
        return callback(null, cache.flvtoolPath);
      }
      async2.waterfall([
        // Try FLVMETA_PATH
        function(cb) {
          if (process.env.FLVMETA_PATH) {
            fs2.exists(process.env.FLVMETA_PATH, function(exists) {
              cb(null, exists ? process.env.FLVMETA_PATH : "");
            });
          } else {
            cb(null, "");
          }
        },
        // Try FLVTOOL2_PATH
        function(flvtool, cb) {
          if (flvtool.length) {
            return cb(null, flvtool);
          }
          if (process.env.FLVTOOL2_PATH) {
            fs2.exists(process.env.FLVTOOL2_PATH, function(exists) {
              cb(null, exists ? process.env.FLVTOOL2_PATH : "");
            });
          } else {
            cb(null, "");
          }
        },
        // Search for flvmeta in the PATH
        function(flvtool, cb) {
          if (flvtool.length) {
            return cb(null, flvtool);
          }
          utils2.which("flvmeta", function(err, flvmeta) {
            cb(err, flvmeta);
          });
        },
        // Search for flvtool2 in the PATH
        function(flvtool, cb) {
          if (flvtool.length) {
            return cb(null, flvtool);
          }
          utils2.which("flvtool2", function(err, flvtool2) {
            cb(err, flvtool2);
          });
        }
      ], function(err, flvtool) {
        if (err) {
          callback(err);
        } else {
          callback(null, cache.flvtoolPath = flvtool || "");
        }
      });
    };
    proto.availableFilters = proto.getAvailableFilters = function(callback) {
      if ("filters" in cache) {
        return callback(null, cache.filters);
      }
      this._spawnFfmpeg(["-filters"], { captureStdout: true, stdoutLines: 0 }, function(err, stdoutRing) {
        if (err) {
          return callback(err);
        }
        var stdout = stdoutRing.get();
        var lines = stdout.split("\n");
        var data = {};
        var types2 = { A: "audio", V: "video", "|": "none" };
        lines.forEach(function(line) {
          var match = line.match(filterRegexp);
          if (match) {
            data[match[1]] = {
              description: match[4],
              input: types2[match[2].charAt(0)],
              multipleInputs: match[2].length > 1,
              output: types2[match[3].charAt(0)],
              multipleOutputs: match[3].length > 1
            };
          }
        });
        callback(null, cache.filters = data);
      });
    };
    proto.availableCodecs = proto.getAvailableCodecs = function(callback) {
      if ("codecs" in cache) {
        return callback(null, cache.codecs);
      }
      this._spawnFfmpeg(["-codecs"], { captureStdout: true, stdoutLines: 0 }, function(err, stdoutRing) {
        if (err) {
          return callback(err);
        }
        var stdout = stdoutRing.get();
        var lines = stdout.split(lineBreakRegexp);
        var data = {};
        lines.forEach(function(line) {
          var match = line.match(avCodecRegexp);
          if (match && match[7] !== "=") {
            data[match[7]] = {
              type: { "V": "video", "A": "audio", "S": "subtitle" }[match[3]],
              description: match[8],
              canDecode: match[1] === "D",
              canEncode: match[2] === "E",
              drawHorizBand: match[4] === "S",
              directRendering: match[5] === "D",
              weirdFrameTruncation: match[6] === "T"
            };
          }
          match = line.match(ffCodecRegexp);
          if (match && match[7] !== "=") {
            var codecData = data[match[7]] = {
              type: { "V": "video", "A": "audio", "S": "subtitle" }[match[3]],
              description: match[8],
              canDecode: match[1] === "D",
              canEncode: match[2] === "E",
              intraFrameOnly: match[4] === "I",
              isLossy: match[5] === "L",
              isLossless: match[6] === "S"
            };
            var encoders = codecData.description.match(ffEncodersRegexp);
            encoders = encoders ? encoders[1].trim().split(" ") : [];
            var decoders = codecData.description.match(ffDecodersRegexp);
            decoders = decoders ? decoders[1].trim().split(" ") : [];
            if (encoders.length || decoders.length) {
              var coderData = {};
              utils2.copy(codecData, coderData);
              delete coderData.canEncode;
              delete coderData.canDecode;
              encoders.forEach(function(name) {
                data[name] = {};
                utils2.copy(coderData, data[name]);
                data[name].canEncode = true;
              });
              decoders.forEach(function(name) {
                if (name in data) {
                  data[name].canDecode = true;
                } else {
                  data[name] = {};
                  utils2.copy(coderData, data[name]);
                  data[name].canDecode = true;
                }
              });
            }
          }
        });
        callback(null, cache.codecs = data);
      });
    };
    proto.availableEncoders = proto.getAvailableEncoders = function(callback) {
      if ("encoders" in cache) {
        return callback(null, cache.encoders);
      }
      this._spawnFfmpeg(["-encoders"], { captureStdout: true, stdoutLines: 0 }, function(err, stdoutRing) {
        if (err) {
          return callback(err);
        }
        var stdout = stdoutRing.get();
        var lines = stdout.split(lineBreakRegexp);
        var data = {};
        lines.forEach(function(line) {
          var match = line.match(encodersRegexp);
          if (match && match[7] !== "=") {
            data[match[7]] = {
              type: { "V": "video", "A": "audio", "S": "subtitle" }[match[1]],
              description: match[8],
              frameMT: match[2] === "F",
              sliceMT: match[3] === "S",
              experimental: match[4] === "X",
              drawHorizBand: match[5] === "B",
              directRendering: match[6] === "D"
            };
          }
        });
        callback(null, cache.encoders = data);
      });
    };
    proto.availableFormats = proto.getAvailableFormats = function(callback) {
      if ("formats" in cache) {
        return callback(null, cache.formats);
      }
      this._spawnFfmpeg(["-formats"], { captureStdout: true, stdoutLines: 0 }, function(err, stdoutRing) {
        if (err) {
          return callback(err);
        }
        var stdout = stdoutRing.get();
        var lines = stdout.split(lineBreakRegexp);
        var data = {};
        lines.forEach(function(line) {
          var match = line.match(formatRegexp);
          if (match) {
            match[3].split(",").forEach(function(format) {
              if (!(format in data)) {
                data[format] = {
                  description: match[4],
                  canDemux: false,
                  canMux: false
                };
              }
              if (match[1] === "D") {
                data[format].canDemux = true;
              }
              if (match[2] === "E") {
                data[format].canMux = true;
              }
            });
          }
        });
        callback(null, cache.formats = data);
      });
    };
    proto._checkCapabilities = function(callback) {
      var self2 = this;
      async2.waterfall([
        // Get available formats
        function(cb) {
          self2.availableFormats(cb);
        },
        // Check whether specified formats are available
        function(formats, cb) {
          var unavailable;
          unavailable = self2._outputs.reduce(function(fmts, output2) {
            var format = output2.options.find("-f", 1);
            if (format) {
              if (!(format[0] in formats) || !formats[format[0]].canMux) {
                fmts.push(format);
              }
            }
            return fmts;
          }, []);
          if (unavailable.length === 1) {
            return cb(new Error("Output format " + unavailable[0] + " is not available"));
          } else if (unavailable.length > 1) {
            return cb(new Error("Output formats " + unavailable.join(", ") + " are not available"));
          }
          unavailable = self2._inputs.reduce(function(fmts, input) {
            var format = input.options.find("-f", 1);
            if (format) {
              if (!(format[0] in formats) || !formats[format[0]].canDemux) {
                fmts.push(format[0]);
              }
            }
            return fmts;
          }, []);
          if (unavailable.length === 1) {
            return cb(new Error("Input format " + unavailable[0] + " is not available"));
          } else if (unavailable.length > 1) {
            return cb(new Error("Input formats " + unavailable.join(", ") + " are not available"));
          }
          cb();
        },
        // Get available codecs
        function(cb) {
          self2.availableEncoders(cb);
        },
        // Check whether specified codecs are available and add strict experimental options if needed
        function(encoders, cb) {
          var unavailable;
          unavailable = self2._outputs.reduce(function(cdcs, output2) {
            var acodec = output2.audio.find("-acodec", 1);
            if (acodec && acodec[0] !== "copy") {
              if (!(acodec[0] in encoders) || encoders[acodec[0]].type !== "audio") {
                cdcs.push(acodec[0]);
              }
            }
            return cdcs;
          }, []);
          if (unavailable.length === 1) {
            return cb(new Error("Audio codec " + unavailable[0] + " is not available"));
          } else if (unavailable.length > 1) {
            return cb(new Error("Audio codecs " + unavailable.join(", ") + " are not available"));
          }
          unavailable = self2._outputs.reduce(function(cdcs, output2) {
            var vcodec = output2.video.find("-vcodec", 1);
            if (vcodec && vcodec[0] !== "copy") {
              if (!(vcodec[0] in encoders) || encoders[vcodec[0]].type !== "video") {
                cdcs.push(vcodec[0]);
              }
            }
            return cdcs;
          }, []);
          if (unavailable.length === 1) {
            return cb(new Error("Video codec " + unavailable[0] + " is not available"));
          } else if (unavailable.length > 1) {
            return cb(new Error("Video codecs " + unavailable.join(", ") + " are not available"));
          }
          cb();
        }
      ], callback);
    };
  };
  return capabilities;
}
var ffprobe;
var hasRequiredFfprobe;
function requireFfprobe() {
  if (hasRequiredFfprobe) return ffprobe;
  hasRequiredFfprobe = 1;
  var spawn = require$$0$4.spawn;
  function legacyTag(key) {
    return key.match(/^TAG:/);
  }
  function legacyDisposition(key) {
    return key.match(/^DISPOSITION:/);
  }
  function parseFfprobeOutput(out2) {
    var lines = out2.split(/\r\n|\r|\n/);
    lines = lines.filter(function(line2) {
      return line2.length > 0;
    });
    var data = {
      streams: [],
      format: {},
      chapters: []
    };
    function parseBlock(name) {
      var data2 = {};
      var line2 = lines.shift();
      while (typeof line2 !== "undefined") {
        if (line2.toLowerCase() == "[/" + name + "]") {
          return data2;
        } else if (line2.match(/^\[/)) {
          line2 = lines.shift();
          continue;
        }
        var kv = line2.match(/^([^=]+)=(.*)$/);
        if (kv) {
          if (!kv[1].match(/^TAG:/) && kv[2].match(/^[0-9]+(\.[0-9]+)?$/)) {
            data2[kv[1]] = Number(kv[2]);
          } else {
            data2[kv[1]] = kv[2];
          }
        }
        line2 = lines.shift();
      }
      return data2;
    }
    var line = lines.shift();
    while (typeof line !== "undefined") {
      if (line.match(/^\[stream/i)) {
        var stream = parseBlock("stream");
        data.streams.push(stream);
      } else if (line.match(/^\[chapter/i)) {
        var chapter = parseBlock("chapter");
        data.chapters.push(chapter);
      } else if (line.toLowerCase() === "[format]") {
        data.format = parseBlock("format");
      }
      line = lines.shift();
    }
    return data;
  }
  ffprobe = function(proto) {
    proto.ffprobe = function() {
      var input, index = null, options = [], callback;
      var callback = arguments[arguments.length - 1];
      var ended = false;
      function handleCallback(err, data) {
        if (!ended) {
          ended = true;
          callback(err, data);
        }
      }
      switch (arguments.length) {
        case 3:
          index = arguments[0];
          options = arguments[1];
          break;
        case 2:
          if (typeof arguments[0] === "number") {
            index = arguments[0];
          } else if (Array.isArray(arguments[0])) {
            options = arguments[0];
          }
          break;
      }
      if (index === null) {
        if (!this._currentInput) {
          return handleCallback(new Error("No input specified"));
        }
        input = this._currentInput;
      } else {
        input = this._inputs[index];
        if (!input) {
          return handleCallback(new Error("Invalid input index"));
        }
      }
      this._getFfprobePath(function(err, path2) {
        if (err) {
          return handleCallback(err);
        } else if (!path2) {
          return handleCallback(new Error("Cannot find ffprobe"));
        }
        var stdout = "";
        var stdoutClosed = false;
        var stderr = "";
        var stderrClosed = false;
        var src2 = input.isStream ? "pipe:0" : input.source;
        var ffprobe2 = spawn(path2, ["-show_streams", "-show_format"].concat(options, src2), { windowsHide: true });
        if (input.isStream) {
          ffprobe2.stdin.on("error", function(err2) {
            if (["ECONNRESET", "EPIPE", "EOF"].indexOf(err2.code) >= 0) {
              return;
            }
            handleCallback(err2);
          });
          ffprobe2.stdin.on("close", function() {
            input.source.pause();
            input.source.unpipe(ffprobe2.stdin);
          });
          input.source.pipe(ffprobe2.stdin);
        }
        ffprobe2.on("error", callback);
        var exitError = null;
        function handleExit(err2) {
          if (err2) {
            exitError = err2;
          }
          if (processExited && stdoutClosed && stderrClosed) {
            if (exitError) {
              if (stderr) {
                exitError.message += "\n" + stderr;
              }
              return handleCallback(exitError);
            }
            var data = parseFfprobeOutput(stdout);
            [data.format].concat(data.streams).forEach(function(target) {
              if (target) {
                var legacyTagKeys = Object.keys(target).filter(legacyTag);
                if (legacyTagKeys.length) {
                  target.tags = target.tags || {};
                  legacyTagKeys.forEach(function(tagKey) {
                    target.tags[tagKey.substr(4)] = target[tagKey];
                    delete target[tagKey];
                  });
                }
                var legacyDispositionKeys = Object.keys(target).filter(legacyDisposition);
                if (legacyDispositionKeys.length) {
                  target.disposition = target.disposition || {};
                  legacyDispositionKeys.forEach(function(dispositionKey) {
                    target.disposition[dispositionKey.substr(12)] = target[dispositionKey];
                    delete target[dispositionKey];
                  });
                }
              }
            });
            handleCallback(null, data);
          }
        }
        var processExited = false;
        ffprobe2.on("exit", function(code, signal) {
          processExited = true;
          if (code) {
            handleExit(new Error("ffprobe exited with code " + code));
          } else if (signal) {
            handleExit(new Error("ffprobe was killed with signal " + signal));
          } else {
            handleExit();
          }
        });
        ffprobe2.stdout.on("data", function(data) {
          stdout += data;
        });
        ffprobe2.stdout.on("close", function() {
          stdoutClosed = true;
          handleExit();
        });
        ffprobe2.stderr.on("data", function(data) {
          stderr += data;
        });
        ffprobe2.stderr.on("close", function() {
          stderrClosed = true;
          handleExit();
        });
      });
    };
  };
  return ffprobe;
}
var recipes;
var hasRequiredRecipes;
function requireRecipes() {
  if (hasRequiredRecipes) return recipes;
  hasRequiredRecipes = 1;
  var fs2 = fs$1;
  var path$1 = path;
  var PassThrough = require$$0$1.PassThrough;
  var async2 = requireAsync();
  var utils2 = requireUtils();
  recipes = function recipes2(proto) {
    proto.saveToFile = proto.save = function(output2) {
      this.output(output2).run();
      return this;
    };
    proto.writeToStream = proto.pipe = proto.stream = function(stream, options) {
      if (stream && !("writable" in stream)) {
        options = stream;
        stream = void 0;
      }
      if (!stream) {
        if (process.version.match(/v0\.8\./)) {
          throw new Error("PassThrough stream is not supported on node v0.8");
        }
        stream = new PassThrough();
      }
      this.output(stream, options).run();
      return stream;
    };
    proto.takeScreenshots = proto.thumbnail = proto.thumbnails = proto.screenshot = proto.screenshots = function(config, folder) {
      var self2 = this;
      var source = this._currentInput.source;
      config = config || { count: 1 };
      if (typeof config === "number") {
        config = {
          count: config
        };
      }
      if (!("folder" in config)) {
        config.folder = folder || ".";
      }
      if ("timestamps" in config) {
        config.timemarks = config.timestamps;
      }
      if (!("timemarks" in config)) {
        if (!config.count) {
          throw new Error("Cannot take screenshots: neither a count nor a timemark list are specified");
        }
        var interval = 100 / (1 + config.count);
        config.timemarks = [];
        for (var i = 0; i < config.count; i++) {
          config.timemarks.push(interval * (i + 1) + "%");
        }
      }
      if ("size" in config) {
        var fixedSize = config.size.match(/^(\d+)x(\d+)$/);
        var fixedWidth = config.size.match(/^(\d+)x\?$/);
        var fixedHeight = config.size.match(/^\?x(\d+)$/);
        var percentSize = config.size.match(/^(\d+)%$/);
        if (!fixedSize && !fixedWidth && !fixedHeight && !percentSize) {
          throw new Error("Invalid size parameter: " + config.size);
        }
      }
      var metadata;
      function getMetadata(cb) {
        if (metadata) {
          cb(null, metadata);
        } else {
          self2.ffprobe(function(err, meta) {
            metadata = meta;
            cb(err, meta);
          });
        }
      }
      async2.waterfall([
        // Compute percent timemarks if any
        function computeTimemarks(next) {
          if (config.timemarks.some(function(t) {
            return ("" + t).match(/^[\d.]+%$/);
          })) {
            if (typeof source !== "string") {
              return next(new Error("Cannot compute screenshot timemarks with an input stream, please specify fixed timemarks"));
            }
            getMetadata(function(err, meta) {
              if (err) {
                next(err);
              } else {
                var vstream = meta.streams.reduce(function(biggest, stream) {
                  if (stream.codec_type === "video" && stream.width * stream.height > biggest.width * biggest.height) {
                    return stream;
                  } else {
                    return biggest;
                  }
                }, { width: 0, height: 0 });
                if (vstream.width === 0) {
                  return next(new Error("No video stream in input, cannot take screenshots"));
                }
                var duration = Number(vstream.duration);
                if (isNaN(duration)) {
                  duration = Number(meta.format.duration);
                }
                if (isNaN(duration)) {
                  return next(new Error("Could not get input duration, please specify fixed timemarks"));
                }
                config.timemarks = config.timemarks.map(function(mark) {
                  if (("" + mark).match(/^([\d.]+)%$/)) {
                    return duration * parseFloat(mark) / 100;
                  } else {
                    return mark;
                  }
                });
                next();
              }
            });
          } else {
            next();
          }
        },
        // Turn all timemarks into numbers and sort them
        function normalizeTimemarks(next) {
          config.timemarks = config.timemarks.map(function(mark) {
            return utils2.timemarkToSeconds(mark);
          }).sort(function(a, b) {
            return a - b;
          });
          next();
        },
        // Add '_%i' to pattern when requesting multiple screenshots and no variable token is present
        function fixPattern(next) {
          var pattern = config.filename || "tn.png";
          if (pattern.indexOf(".") === -1) {
            pattern += ".png";
          }
          if (config.timemarks.length > 1 && !pattern.match(/%(s|0*i)/)) {
            var ext = path$1.extname(pattern);
            pattern = path$1.join(path$1.dirname(pattern), path$1.basename(pattern, ext) + "_%i" + ext);
          }
          next(null, pattern);
        },
        // Replace filename tokens (%f, %b) in pattern
        function replaceFilenameTokens(pattern, next) {
          if (pattern.match(/%[bf]/)) {
            if (typeof source !== "string") {
              return next(new Error("Cannot replace %f or %b when using an input stream"));
            }
            pattern = pattern.replace(/%f/g, path$1.basename(source)).replace(/%b/g, path$1.basename(source, path$1.extname(source)));
          }
          next(null, pattern);
        },
        // Compute size if needed
        function getSize(pattern, next) {
          if (pattern.match(/%[whr]/)) {
            if (fixedSize) {
              return next(null, pattern, fixedSize[1], fixedSize[2]);
            }
            getMetadata(function(err, meta) {
              if (err) {
                return next(new Error("Could not determine video resolution to replace %w, %h or %r"));
              }
              var vstream = meta.streams.reduce(function(biggest, stream) {
                if (stream.codec_type === "video" && stream.width * stream.height > biggest.width * biggest.height) {
                  return stream;
                } else {
                  return biggest;
                }
              }, { width: 0, height: 0 });
              if (vstream.width === 0) {
                return next(new Error("No video stream in input, cannot replace %w, %h or %r"));
              }
              var width = vstream.width;
              var height = vstream.height;
              if (fixedWidth) {
                height = height * Number(fixedWidth[1]) / width;
                width = Number(fixedWidth[1]);
              } else if (fixedHeight) {
                width = width * Number(fixedHeight[1]) / height;
                height = Number(fixedHeight[1]);
              } else if (percentSize) {
                width = width * Number(percentSize[1]) / 100;
                height = height * Number(percentSize[1]) / 100;
              }
              next(null, pattern, Math.round(width / 2) * 2, Math.round(height / 2) * 2);
            });
          } else {
            next(null, pattern, -1, -1);
          }
        },
        // Replace size tokens (%w, %h, %r) in pattern
        function replaceSizeTokens(pattern, width, height, next) {
          pattern = pattern.replace(/%r/g, "%wx%h").replace(/%w/g, width).replace(/%h/g, height);
          next(null, pattern);
        },
        // Replace variable tokens in pattern (%s, %i) and generate filename list
        function replaceVariableTokens(pattern, next) {
          var filenames = config.timemarks.map(function(t, i2) {
            return pattern.replace(/%s/g, utils2.timemarkToSeconds(t)).replace(/%(0*)i/g, function(match, padding) {
              var idx = "" + (i2 + 1);
              return padding.substr(0, Math.max(0, padding.length + 1 - idx.length)) + idx;
            });
          });
          self2.emit("filenames", filenames);
          next(null, filenames);
        },
        // Create output directory
        function createDirectory(filenames, next) {
          fs2.exists(config.folder, function(exists) {
            if (!exists) {
              fs2.mkdir(config.folder, function(err) {
                if (err) {
                  next(err);
                } else {
                  next(null, filenames);
                }
              });
            } else {
              next(null, filenames);
            }
          });
        }
      ], function runCommand(err, filenames) {
        if (err) {
          return self2.emit("error", err);
        }
        var count = config.timemarks.length;
        var split;
        var filters = [split = {
          filter: "split",
          options: count,
          outputs: []
        }];
        if ("size" in config) {
          self2.size(config.size);
          var sizeFilters = self2._currentOutput.sizeFilters.get().map(function(f, i3) {
            if (i3 > 0) {
              f.inputs = "size" + (i3 - 1);
            }
            f.outputs = "size" + i3;
            return f;
          });
          split.inputs = "size" + (sizeFilters.length - 1);
          filters = sizeFilters.concat(filters);
          self2._currentOutput.sizeFilters.clear();
        }
        var first = 0;
        for (var i2 = 0; i2 < count; i2++) {
          var stream = "screen" + i2;
          split.outputs.push(stream);
          if (i2 === 0) {
            first = config.timemarks[i2];
            self2.seekInput(first);
          }
          self2.output(path$1.join(config.folder, filenames[i2])).frames(1).map(stream);
          if (i2 > 0) {
            self2.seek(config.timemarks[i2] - first);
          }
        }
        self2.complexFilter(filters);
        self2.run();
      });
      return this;
    };
    proto.mergeToFile = proto.concatenate = proto.concat = function(target, options) {
      var fileInput = this._inputs.filter(function(input) {
        return !input.isStream;
      })[0];
      var self2 = this;
      this.ffprobe(this._inputs.indexOf(fileInput), function(err, data) {
        if (err) {
          return self2.emit("error", err);
        }
        var hasAudioStreams = data.streams.some(function(stream) {
          return stream.codec_type === "audio";
        });
        var hasVideoStreams = data.streams.some(function(stream) {
          return stream.codec_type === "video";
        });
        self2.output(target, options).complexFilter({
          filter: "concat",
          options: {
            n: self2._inputs.length,
            v: hasVideoStreams ? 1 : 0,
            a: hasAudioStreams ? 1 : 0
          }
        }).run();
      });
      return this;
    };
  };
  return recipes;
}
var fluentFfmpeg$1;
var hasRequiredFluentFfmpeg$1;
function requireFluentFfmpeg$1() {
  if (hasRequiredFluentFfmpeg$1) return fluentFfmpeg$1;
  hasRequiredFluentFfmpeg$1 = 1;
  var path$1 = path;
  var util2 = require$$1;
  var EventEmitter = require$$0$2.EventEmitter;
  var utils2 = requireUtils();
  function FfmpegCommand(input, options) {
    if (!(this instanceof FfmpegCommand)) {
      return new FfmpegCommand(input, options);
    }
    EventEmitter.call(this);
    if (typeof input === "object" && !("readable" in input)) {
      options = input;
    } else {
      options = options || {};
      options.source = input;
    }
    this._inputs = [];
    if (options.source) {
      this.input(options.source);
    }
    this._outputs = [];
    this.output();
    var self2 = this;
    ["_global", "_complexFilters"].forEach(function(prop) {
      self2[prop] = utils2.args();
    });
    options.stdoutLines = "stdoutLines" in options ? options.stdoutLines : 100;
    options.presets = options.presets || options.preset || path$1.join(__dirname, "presets");
    options.niceness = options.niceness || options.priority || 0;
    this.options = options;
    this.logger = options.logger || {
      debug: function() {
      },
      info: function() {
      },
      warn: function() {
      },
      error: function() {
      }
    };
  }
  util2.inherits(FfmpegCommand, EventEmitter);
  fluentFfmpeg$1 = FfmpegCommand;
  FfmpegCommand.prototype.clone = function() {
    var clone = new FfmpegCommand();
    var self2 = this;
    clone.options = this.options;
    clone.logger = this.logger;
    clone._inputs = this._inputs.map(function(input) {
      return {
        source: input.source,
        options: input.options.clone()
      };
    });
    if ("target" in this._outputs[0]) {
      clone._outputs = [];
      clone.output();
    } else {
      clone._outputs = [
        clone._currentOutput = {
          flags: {}
        }
      ];
      ["audio", "audioFilters", "video", "videoFilters", "sizeFilters", "options"].forEach(function(key) {
        clone._currentOutput[key] = self2._currentOutput[key].clone();
      });
      if (this._currentOutput.sizeData) {
        clone._currentOutput.sizeData = {};
        utils2.copy(this._currentOutput.sizeData, clone._currentOutput.sizeData);
      }
      utils2.copy(this._currentOutput.flags, clone._currentOutput.flags);
    }
    ["_global", "_complexFilters"].forEach(function(prop) {
      clone[prop] = self2[prop].clone();
    });
    return clone;
  };
  requireInputs()(FfmpegCommand.prototype);
  requireAudio()(FfmpegCommand.prototype);
  requireVideo()(FfmpegCommand.prototype);
  requireVideosize()(FfmpegCommand.prototype);
  requireOutput()(FfmpegCommand.prototype);
  requireCustom()(FfmpegCommand.prototype);
  requireMisc()(FfmpegCommand.prototype);
  requireProcessor()(FfmpegCommand.prototype);
  requireCapabilities()(FfmpegCommand.prototype);
  FfmpegCommand.setFfmpegPath = function(path2) {
    new FfmpegCommand().setFfmpegPath(path2);
  };
  FfmpegCommand.setFfprobePath = function(path2) {
    new FfmpegCommand().setFfprobePath(path2);
  };
  FfmpegCommand.setFlvtoolPath = function(path2) {
    new FfmpegCommand().setFlvtoolPath(path2);
  };
  FfmpegCommand.availableFilters = FfmpegCommand.getAvailableFilters = function(callback) {
    new FfmpegCommand().availableFilters(callback);
  };
  FfmpegCommand.availableCodecs = FfmpegCommand.getAvailableCodecs = function(callback) {
    new FfmpegCommand().availableCodecs(callback);
  };
  FfmpegCommand.availableFormats = FfmpegCommand.getAvailableFormats = function(callback) {
    new FfmpegCommand().availableFormats(callback);
  };
  FfmpegCommand.availableEncoders = FfmpegCommand.getAvailableEncoders = function(callback) {
    new FfmpegCommand().availableEncoders(callback);
  };
  requireFfprobe()(FfmpegCommand.prototype);
  FfmpegCommand.ffprobe = function(file2) {
    var instance = new FfmpegCommand(file2);
    instance.ffprobe.apply(instance, Array.prototype.slice.call(arguments, 1));
  };
  requireRecipes()(FfmpegCommand.prototype);
  return fluentFfmpeg$1;
}
var fluentFfmpeg;
var hasRequiredFluentFfmpeg;
function requireFluentFfmpeg() {
  if (hasRequiredFluentFfmpeg) return fluentFfmpeg;
  hasRequiredFluentFfmpeg = 1;
  fluentFfmpeg = requireFluentFfmpeg$1();
  return fluentFfmpeg;
}
var fluentFfmpegExports = requireFluentFfmpeg();
const ffmpeg = /* @__PURE__ */ getDefaultExportFromCjs(fluentFfmpegExports);
let stopAutomationFlag = false;
let stopExtendedVideoFlag = false;
const STATUS_CHECK_INTERVAL = 3e3;
let ffmpegCommand = null;
let mainWindow = null;
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const isDev = !!VITE_DEV_SERVER_URL;
const apiErrorMap = /* @__PURE__ */ new Map([
  ["https://mmoreal.com/api/prf.php", "E001"],
  ["https://labs.google/fx/api/trpc/project.createProject", "E002"],
  ["https://aisandbox-pa.googleapis.com/v1/video:batchAsyncGenerateVideoText", "E003"],
  ["https://aisandbox-pa.googleapis.com/v1/video:batchCheckAsyncVideoGenerationStatus", "E004"],
  ["https://aisandbox-pa.googleapis.com/v1:uploadUserImage", "E005"],
  ["https://aisandbox-pa.googleapis.com/v1/video:batchAsyncGenerateVideoStartAndEndImage", "E006"],
  ["https://labs.google/fx/api/trpc/media.createOrUpdateWorkflow", "E007"],
  ["https://aisandbox-pa.googleapis.com/v1/whisk:generateImage", "E008"],
  // Thêm endpoint whisk
  ["https://aisandbox-pa.googleapis.com/v1/whisk:runImageRecipe", "E008"],
  // Thêm endpoint whisk recipe
  ["https://labs.google/fx/api/trpc/backbone.uploadImage", "E007"],
  // Thêm endpoint upload whisk
  ["https://aisandbox-pa.googleapis.com/v1/video:batchAsyncGenerateVideoStartImage", "E009"]
]);
async function handleApiRequest(_event, { url, cookie, options }) {
  try {
    const targetUrl = new URL(url);
    let headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Origin": "https://labs.google",
      "Referer": "https://labs.google/",
      ...options.headers
    };
    if (!headers["Content-Type"] && !url.includes("/whisk:")) {
      headers["Content-Type"] = "application/json";
    } else if (url.includes("/whisk:")) {
      headers["Content-Type"] = "text/plain;charset=UTF-8";
    }
    if (cookie && cookie.bearerToken) {
      let token = cookie.bearerToken;
      const secretSuffix = "-gCktgGis5K8si7sJ8sTKdHdsaHK84s";
      if (token.endsWith(secretSuffix)) {
        token = token.slice(0, -secretSuffix.length);
      }
      const finalToken = token.startsWith("Bearer ") ? token.substring(7) : token;
      headers["Authorization"] = `Bearer ${finalToken}`;
    }
    if (cookie && cookie.value) {
      headers["Cookie"] = cookie.value;
    }
    if (targetUrl.hostname === "aisandbox-pa.googleapis.com" && !url.includes(":uploadUserImage")) {
      if (!headers["Authorization"]) {
        throw new Error("Bearer Token is required for aisandbox API.");
      }
    }
    const body = typeof options.body === "object" && !url.includes("/whisk:") ? JSON.stringify(options.body) : options.body;
    const response = await fetch(url, { ...options, headers, body });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("API Error Response:", errorText);
      const errorCode = apiErrorMap.get(url) || "UNKNOWN_API";
      const error2 = new Error(`${response.status} (${errorCode})`);
      error2.statusCode = response.status;
      error2.details = errorText;
      throw error2;
    }
    const text = await response.text();
    const contentType = response.headers.get("content-type");
    if (text && contentType && contentType.includes("application/json")) {
      return JSON.parse(text);
    } else if (text && url.includes("/whisk:")) {
      try {
        return JSON.parse(text);
      } catch {
        if (text.toLowerCase().includes("error")) {
          const errorCode = apiErrorMap.get(url) || "WHISK_ERROR";
          const error2 = new Error(`${response.status} (${errorCode}) - Whisk Error`);
          error2.statusCode = response.status;
          error2.details = text;
          throw error2;
        }
        console.warn("Whisk API response was not JSON:", text);
        return { rawText: text };
      }
    } else if (text) {
      return JSON.parse(text);
    } else {
      return {};
    }
  } catch (error2) {
    const errorCode = apiErrorMap.get(url) || "NETWORK_ERROR";
    console.error(`Failed to fetch ( ${errorCode})`, error2.details ? `Details: ${error2.details}` : error2);
    const detailString = error2.details ? ` - API Response: ${error2.details}` : "";
    throw new Error(`(${errorCode}): ${error2.message}${detailString}`);
  }
}
require$$1$3.ipcMain.on("browser:stop-automation", () => {
  console.log("Received stop automation signal.");
  stopAutomationFlag = true;
});
require$$1$3.ipcMain.handle("save-image-to-disk", async (event, { base64Data, savePath, filename, promptIndex }) => {
  try {
    if (!savePath || !filename) {
      throw new Error("Đường dẫn lưu hoặc tên file không được cung cấp.");
    }
    const ext = path.extname(filename) || ".png";
    const indexPrefix = typeof promptIndex === "number" && promptIndex >= 0 ? `${promptIndex + 1}_` : "";
    let baseNamePart = path.basename(filename, ext).substring(0, 30).replace(/[^a-z0-9_]/gi, "_");
    const safeFilename = `${indexPrefix}${baseNamePart}_${Date.now()}${ext}`;
    const fullPath = path.join(savePath, safeFilename);
    const dirPath = path.dirname(fullPath);
    if (!fs$1.existsSync(dirPath)) fs$1.mkdirSync(dirPath, { recursive: true });
    const data = base64Data.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(data, "base64");
    await fs$1.promises.writeFile(fullPath, buffer);
    console.log(`[save-image-to-disk] Saved image to: ${fullPath}`);
    return { success: true, path: fullPath };
  } catch (error2) {
    console.error("Lỗi khi lưu file ảnh:", error2);
    return { success: false, error: error2.message };
  }
});
require$$1$3.ipcMain.on("download-image", async (event, { imageDataUrl, storyTitle }) => {
  const mainWindow2 = require$$1$3.BrowserWindow.fromWebContents(event.sender);
  if (!mainWindow2) return;
  const defaultFilename = `thumbnail_${Date.now()}.png`;
  const { canceled, filePath } = await require$$1$3.dialog.showSaveDialog(mainWindow2, {
    title: "Lưu ảnh thumbnail",
    defaultPath: defaultFilename,
    filters: [{ name: "PNG Images", extensions: ["png"] }]
  });
  if (canceled || !filePath) {
    mainWindow2.webContents.send("download-complete", { success: false, error: "Download canceled" });
    return;
  }
  try {
    const base64Data = imageDataUrl.replace(/^data:image\/(png|jpeg);base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    fs$1.writeFileSync(filePath, buffer);
    mainWindow2.webContents.send("download-complete", { success: true, path: filePath });
  } catch (error2) {
    console.error("Image download error:", error2);
    mainWindow2.webContents.send("download-complete", { success: false, error: error2.message });
  }
});
require$$1$3.ipcMain.handle("select-download-directory", async (event) => {
  const mainWindow2 = require$$1$3.BrowserWindow.fromWebContents(event.sender);
  const { canceled, filePaths } = await require$$1$3.dialog.showOpenDialog(mainWindow2, {
    properties: ["openDirectory"]
  });
  if (canceled || filePaths.length === 0) {
    return null;
  }
  return filePaths[0];
});
function stripBom(content) {
  if (content.charCodeAt(0) === 65279) {
    return content.slice(1);
  }
  return content;
}
require$$1$3.ipcMain.handle("import-prompts-from-file", async (event) => {
  const mainWindow2 = require$$1$3.BrowserWindow.fromWebContents(event.sender);
  if (!mainWindow2) return { success: false, error: "Main window not found" };
  const { canceled, filePaths } = await require$$1$3.dialog.showOpenDialog(mainWindow2, {
    title: "Chọn file .txt chứa prompts",
    filters: [{ name: "Text Files", extensions: ["txt"] }],
    properties: ["openFile"]
  });
  if (canceled || filePaths.length === 0) {
    return { success: false, error: "No file selected" };
  }
  try {
    const filePath = filePaths[0];
    const content = stripBom(fs$1.readFileSync(filePath, "utf-8"));
    let prompts = [];
    try {
      const jsonData = JSON.parse(content);
      let jsonArray = [];
      if (Array.isArray(jsonData)) {
        jsonArray = jsonData;
      } else if (typeof jsonData === "object" && jsonData !== null && Array.isArray(jsonData.prompts)) {
        jsonArray = jsonData.prompts;
      } else {
        throw new Error("Nội dung JSON không phải là mảng, xử lý như text.");
      }
      prompts = jsonArray.map((item) => {
        if (typeof item === "object" && item !== null) {
          return JSON.stringify(item, null, 2);
        } else if (typeof item === "string") {
          return item;
        }
        return null;
      }).filter((p) => p !== null && p.trim() !== "");
      if (prompts.length > 0) {
        return { success: true, prompts };
      } else {
        throw new Error("Mảng JSON không chứa prompt hợp lệ nào.");
      }
    } catch (jsonError) {
      prompts = content.split(/\r?\n/).filter((line) => line.trim() !== "");
      if (prompts.length > 0) {
        return { success: true, prompts };
      } else {
        throw new Error("Không tìm thấy nội dung hợp lệ nào trong tệp.");
      }
    }
  } catch (error2) {
    console.error("File import error:", error2);
    return { success: false, error: error2.message };
  }
});
require$$1$3.ipcMain.handle("import-prompts-from-json", async (event) => {
  const mainWindow2 = require$$1$3.BrowserWindow.fromWebContents(event.sender);
  if (!mainWindow2) return { success: false, error: "Main window not found" };
  const { canceled, filePaths } = await require$$1$3.dialog.showOpenDialog(mainWindow2, {
    title: "Chọn file .json chứa prompts",
    filters: [{ name: "JSON Files", extensions: ["json"] }],
    properties: ["openFile"]
  });
  if (canceled || filePaths.length === 0) {
    return { success: false, error: "No file selected" };
  }
  try {
    const filePath = filePaths[0];
    const content = stripBom(fs$1.readFileSync(filePath, "utf-8"));
    const jsonData = JSON.parse(content);
    let jsonArray = [];
    if (Array.isArray(jsonData)) {
      jsonArray = jsonData;
    } else if (typeof jsonData === "object" && jsonData !== null && Array.isArray(jsonData.prompts)) {
      jsonArray = jsonData.prompts;
    } else {
      throw new Error('Định dạng JSON không hợp lệ. Cần một mảng (array) hoặc object chứa key "prompts".');
    }
    const prompts = jsonArray.map((item) => {
      if (typeof item === "object" && item !== null) {
        return JSON.stringify(item, null, 2);
      } else if (typeof item === "string") {
        return item;
      }
      return null;
    }).filter((p) => p !== null && p.trim() !== "");
    if (prompts.length === 0) {
      throw new Error("Không tìm thấy prompt hợp lệ nào trong tệp JSON.");
    }
    return { success: true, prompts };
  } catch (error2) {
    console.error("JSON import error:", error2);
    const errorMessage = error2 instanceof SyntaxError ? `Lỗi phân tích cú pháp JSON: ${error2.message}` : `Lỗi đọc hoặc xử lý file: ${error2.message}`;
    return { success: false, error: errorMessage };
  }
});
require$$1$3.ipcMain.handle("get-app-version", () => {
  return require$$1$3.app.getVersion();
});
const downloadFile = async (mainWindow2, url, promptText, savePath, promptIndex, autoSaveConfig) => {
  let finalPath = null;
  let finalSaveDirectory = savePath;
  if (autoSaveConfig.enabled && autoSaveConfig.path) {
    finalSaveDirectory = autoSaveConfig.path;
    finalPath = finalSaveDirectory;
  } else if (savePath) {
    finalPath = savePath;
    finalSaveDirectory = path.dirname(savePath);
  } else {
    const defaultFilename = `${promptIndex + 1}_${Date.now()}.mp4`;
    const { canceled, filePath } = await require$$1$3.dialog.showSaveDialog(mainWindow2, {
      title: "Lưu video",
      defaultPath: defaultFilename,
      filters: [{ name: "MP4 Videos", extensions: ["mp4"] }]
    });
    if (canceled || !filePath) {
      mainWindow2.webContents.send("download-complete", { success: false, error: "Download canceled" });
      return { success: false, error: "Download canceled" };
    }
    finalPath = filePath;
    finalSaveDirectory = path.dirname(filePath);
  }
  if (finalPath && finalSaveDirectory) {
    try {
      if (autoSaveConfig.enabled && autoSaveConfig.splitFolders && autoSaveConfig.videosPerFolder > 0) {
        const partIndex = Math.floor(promptIndex / autoSaveConfig.videosPerFolder) + 1;
        finalSaveDirectory = path.join(finalSaveDirectory, `Phần ${partIndex}`);
      }
      if (finalSaveDirectory && !fs$1.existsSync(finalSaveDirectory)) {
        fs$1.mkdirSync(finalSaveDirectory, { recursive: true });
        console.log(`Đã tạo thư mục (hoặc đã tồn tại): ${finalSaveDirectory}`);
      }
      const stt = promptIndex + 1;
      const timestamp2 = Date.now();
      let finalFilename = `${stt}_${timestamp2}.mp4`;
      try {
        const promptObj = JSON.parse(promptText);
        if (promptObj.scene) {
          const sceneStr = String(promptObj.scene).replace(/[^a-zA-Z0-9_-]/g, "");
          if (sceneStr.length > 0 && sceneStr.length < 20) {
            finalFilename = `${sceneStr}_${timestamp2}.mp4`;
          }
        }
      } catch (e) {
      }
      let potentialPath = path.join(finalSaveDirectory, finalFilename);
      if (fs$1.existsSync(potentialPath)) {
        if (autoSaveConfig.allowOverwrite === true) {
          const newTimestamp = `${timestamp2}_${Math.floor(Math.random() * 1e3)}`;
          const ext = path.extname(finalFilename);
          const baseName = path.basename(finalFilename, ext).split("_")[0];
          finalFilename = `${baseName}_${newTimestamp}${ext}`;
          finalPath = path.join(finalSaveDirectory, finalFilename);
          console.log(`File gốc tồn tại, không cho phép đè. Lưu thành: ${finalFilename}`);
        } else {
          finalPath = potentialPath;
          console.log(`File gốc tồn tại, chế độ xóa file cũ đang BẬT. Xóa file cũ: ${finalFilename}`);
          try {
            fs$1.unlinkSync(potentialPath);
            console.log(`Đã xóa file cũ thành công: ${potentialPath}`);
          } catch (unlinkError) {
            console.error(`Không thể xóa file cũ ${potentialPath}: ${unlinkError.message}`);
          }
        }
      } else {
        finalPath = potentialPath;
      }
    } catch (dirError) {
      const result = { success: false, error: "Lỗi khi xử lý thư mục hoặc tên tệp lưu." };
      console.error("Directory/Filename handling error:", dirError);
      mainWindow2.webContents.send("download-complete", result);
      return result;
    }
  } else {
    const result = { success: false, error: "Không thể xác định đường dẫn lưu file." };
    console.error("Save path determination error.");
    mainWindow2.webContents.send("download-complete", result);
    return result;
  }
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch video: ${response.statusText}`);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs$1.writeFileSync(finalPath, buffer);
    const result = { success: true, path: finalPath };
    mainWindow2.webContents.send("download-complete", result);
    return result;
  } catch (error2) {
    console.error("Download error:", error2);
    const result = { success: false, error: error2.message };
    mainWindow2.webContents.send("download-complete", result);
    return result;
  }
};
require$$1$3.ipcMain.on("download-video", async (event, { url, promptText, savePath, promptIndex }) => {
  const mainWindow2 = require$$1$3.BrowserWindow.fromWebContents(event.sender);
  if (!mainWindow2) return;
  const manualDownloadConfig = {
    enabled: !!savePath,
    path: savePath,
    allowOverwrite: false,
    splitFolders: false,
    videosPerFolder: 10
  };
  await downloadFile(mainWindow2, url, promptText, savePath, promptIndex, manualDownloadConfig);
});
require$$1$3.ipcMain.on("browser:start-automation", async (event, { prompts, authToken, model, aspectRatio, autoSaveConfig, currentUser, concurrentStreams }) => {
  const mainWindow2 = require$$1$3.BrowserWindow.fromWebContents(event.sender);
  if (!mainWindow2) return;
  if (!currentUser || !currentUser.subscription || new Date(currentUser.subscription.end_date) < /* @__PURE__ */ new Date()) {
    const message = !currentUser?.subscription ? "Bạn cần nâng cấp gói." : "Gói đăng ký đã hết hạn.";
    require$$1$3.dialog.showMessageBox(mainWindow2, { type: "warning", title: "Yêu Cầu Nâng Cấp", message });
    mainWindow2.webContents.send("navigate-to-view", "packages");
    return;
  }
  stopAutomationFlag = false;
  const PROMPTS_PER_PROJECT = 4;
  const MAX_COOKIE_RETRIES = 5;
  const MAX_SETUP_RETRIES = 3;
  const modelFallbackList = [
    model,
    "veo_3_1_t2v_fast_ultra",
    "veo_3_1_t2v",
    "veo_3_0_t2v_fast_ultra",
    "veo_3_0_t2v_fast",
    "veo_3_0_t2v",
    "veo_2_1_fast_d_15_t2v"
  ].filter((v, i, a) => a.indexOf(v) === i);
  const sendLog = (promptId, message, status, videoUrl = null, operationName = null, sceneId = null, mediaId = null, projectId = null, cookie = null) => {
    if (mainWindow2 && !mainWindow2.isDestroyed()) {
      mainWindow2.webContents.send("browser:log", { promptId, message, status, videoUrl, operationName, sceneId, mediaId, projectId, cookie });
    }
    console.log(`[${promptId || "general"}] ${message}`);
  };
  const attemptSinglePrompt = async (prompt, projectId, currentCookie) => {
    let promptTextForApi;
    try {
      if (!prompt.text || typeof prompt.text !== "string" || prompt.text.trim() === "") {
        throw new Error("Nội dung Prompt không được để trống.");
      }
      const promptObj = JSON.parse(prompt.text);
      promptTextForApi = promptObj.prompt || promptObj.text;
      if (!promptTextForApi || typeof promptTextForApi !== "string" || promptTextForApi.trim() === "") {
        throw new Error("Không tìm thấy trường 'prompt'/'text' hợp lệ trong JSON hoặc giá trị rỗng.");
      }
      promptTextForApi = promptTextForApi.trim();
    } catch (e) {
      if (!prompt.text || typeof prompt.text !== "string" || prompt.text.trim() === "") {
        return false;
      }
      promptTextForApi = prompt.text.trim();
    }
    for (const modelKey of modelFallbackList) {
      if (stopAutomationFlag) return false;
      try {
        sendLog(prompt.id, `Đang tạo video...`, "submitting");
        const clientGeneratedSceneId = `client-generated-uuid-${Date.now()}-${Math.random()}`;
        const requestBody = {
          "clientContext": { "projectId": projectId, "tool": "PINHOLE" },
          "requests": [{
            "aspectRatio": `VIDEO_ASPECT_RATIO_${aspectRatio.toUpperCase()}`,
            "seed": Math.floor(Math.random() * 1e5),
            "textInput": { "prompt": promptTextForApi },
            "videoModelKey": aspectRatio === "PORTRAIT" ? "veo_3_1_t2v_portrait" : modelKey,
            "metadata": { "sceneId": clientGeneratedSceneId }
          }]
        };
        const generateResponse = await handleApiRequest(null, {
          url: "https://aisandbox-pa.googleapis.com/v1/video:batchAsyncGenerateVideoText",
          cookie: currentCookie,
          options: { method: "POST", body: requestBody }
        });
        const operation = generateResponse?.operations?.[0];
        if (!operation?.operation?.name || !operation?.sceneId) throw new Error("Không lấy được operation/scene ID.");
        sendLog(prompt.id, `Video đang được xử lý..`, "processing", null, operation.operation.name, operation.sceneId, null, projectId, currentCookie);
        while (!stopAutomationFlag) {
          await new Promise((resolve) => setTimeout(resolve, STATUS_CHECK_INTERVAL));
          if (stopAutomationFlag) break;
          sendLog(prompt.id, "Video đang được tạo...", "processing");
          const statusResponse = await handleApiRequest(null, {
            url: "https://aisandbox-pa.googleapis.com/v1/video:batchCheckAsyncVideoGenerationStatus",
            cookie: currentCookie,
            options: { method: "POST", body: { operations: [[{ operation: { name: operation.operation.name }, sceneId: operation.sceneId }]] } }
          });
          if (!statusResponse || !Array.isArray(statusResponse.operations) || statusResponse.operations.length === 0) {
            console.error(`[${prompt.id}] Invalid status response structure:`, statusResponse);
            throw new Error("Cấu trúc phản hồi trạng thái không hợp lệ.");
          }
          const opResult = statusResponse.operations[0];
          const apiStatus = (opResult?.status || "UNKNOWN_STATUS").replace("MEDIA_GENERATION_STATUS_", "").toLowerCase();
          sendLog(prompt.id, `Trạng thái: ${apiStatus}`, "processing");
          if (opResult?.status === "MEDIA_GENERATION_STATUS_SUCCESSFUL") {
            const videoMetadata = opResult?.operation?.metadata?.video;
            if (!videoMetadata || !videoMetadata.fifeUrl && !videoMetadata.servingBaseUri) {
              console.error(`[${prompt.id}] Success status but no video URL found:`, opResult);
              throw new Error("Tạo thành công nhưng không tìm thấy URL video.");
            }
            const videoUrl = videoMetadata.fifeUrl || videoMetadata.servingBaseUri;
            const mediaId = videoMetadata.mediaGenerationId;
            sendLog(prompt.id, "Thành công!", "success", videoUrl, operation.operation.name, operation.sceneId, mediaId, projectId, currentCookie);
            if (autoSaveConfig.enabled && autoSaveConfig.path && videoUrl) {
              await downloadFile(mainWindow2, videoUrl, prompt.text, autoSaveConfig.path, prompt.originalIndex, autoSaveConfig);
            }
            return true;
          } else if (opResult?.status === "MEDIA_GENERATION_STATUS_FAILED") {
            const errorMessage = opResult?.error?.message || "Lỗi không xác định từ Veo.";
            console.error(`[${prompt.id}] API Failure Details:`, opResult?.error);
            throw new Error(errorMessage);
          } else if (opResult?.status === "MEDIA_GENERATION_STATUS_UNSPECIFIED" || !opResult?.status) {
            console.warn(`[${prompt.id}] Trạng thái không xác định từ API:`, opResult);
          }
        }
        if (stopAutomationFlag) return false;
      } catch (processingError) {
        sendLog(prompt.id, `Lvmdht,tmdm...`, "running");
        await new Promise((resolve) => setTimeout(resolve, 3e3));
      }
    }
    sendLog(prompt.id, `Không thể tạo video , Kiểm tra Prompt hoặc CHạy lại lỗi.`, "error");
    return false;
  };
  class ProjectProcessor {
    constructor(prompts2, authToken2, onHalfComplete, onAllPromptsSettled) {
      this.promptsToProcess = prompts2;
      this.authToken = authToken2;
      this.onHalfComplete = onHalfComplete;
      this.onAllPromptsSettled = onAllPromptsSettled;
    }
    async processPromptWithRetries(prompt, initialProjectId, initialCookie) {
      if (!prompt.text || typeof prompt.text !== "string" || prompt.text.trim() === "") {
        sendLog(prompt.id, `Nội dung Prompt không được để trống. Bỏ qua prompt này.`, "error");
        return false;
      }
      let currentCookie = initialCookie;
      let currentProjectId = initialProjectId;
      for (let cookieAttempt = 0; cookieAttempt < MAX_COOKIE_RETRIES; cookieAttempt++) {
        if (stopAutomationFlag) return false;
        if (cookieAttempt > 0) {
          try {
            sendLog(prompt.id, `Dtlvckprjm...`, "running");
            const cookieResponse = await fetch("https://mmoreal.com/api/prf.php", { headers: { "Authorization": `Bearer ${this.authToken}` } });
            const cookieData = await cookieResponse.json();
            if (!cookieData.success) throw new Error("Không thể lấy cookie mới.");
            currentCookie = cookieData.cookie;
            const createProjectResponse = await handleApiRequest(null, {
              url: "https://labs.google/fx/api/trpc/project.createProject",
              cookie: currentCookie,
              options: { method: "POST", body: { json: { projectTitle: `Veo Batch (Retry ${cookieAttempt}) - ${Date.now()}`, toolName: "PINHOLE" } } }
            });
            currentProjectId = createProjectResponse?.result?.data?.json?.result?.projectId;
            if (!currentProjectId) throw new Error("Không thể tạo project mới.");
            sendLog(prompt.id, `Dcprjidm: ${currentProjectId}`, "running");
          } catch (e) {
            sendLog(prompt.id, `Dtlvckm: ${e.message}`, "error");
            await new Promise((resolve) => setTimeout(resolve, 5e3));
            continue;
          }
        }
        const success = await attemptSinglePrompt(prompt, currentProjectId, currentCookie);
        if (success) return true;
        sendLog(prompt.id, `Dtlvckm...`, "running");
      }
      sendLog(prompt.id, `Tạo video thất bại. Prompt có thể vi phạm chính sách, hãy kiểm tra prompt hoặc Chạy lại lỗi.`, "error");
      return false;
    }
    async run() {
      let initialCookie = null;
      let initialProjectId = null;
      let setupSuccess = false;
      for (let setupAttempt = 0; setupAttempt < MAX_SETUP_RETRIES; setupAttempt++) {
        if (stopAutomationFlag) break;
        try {
          sendLog(null, `Ktl...`, "running");
          const cookieResponse = await fetch("https://mmoreal.com/api/prf.php", { headers: { "Authorization": `Bearer ${this.authToken}` } });
          const cookieData = await cookieResponse.json();
          if (!cookieData.success) throw new Error("Không thể lấy cookie.");
          initialCookie = cookieData.cookie;
          const createProjectResponse = await handleApiRequest(null, {
            url: "https://labs.google/fx/api/trpc/project.createProject",
            cookie: initialCookie,
            options: { method: "POST", body: { json: { projectTitle: `Veo Batch - ${Date.now()}`, toolName: "PINHOLE" } } }
          });
          initialProjectId = createProjectResponse?.result?.data?.json?.result?.projectId;
          if (!initialProjectId) throw new Error("Không thể tạo project.");
          sendLog(null, `Ktltc: ${initialProjectId}.`, "running");
          setupSuccess = true;
          break;
        } catch (setupError) {
          sendLog(null, `Lỗi khởi tạo lô, vui lòng Đăng nhập lại: ${setupError.message}`, "error");
          if (setupAttempt < MAX_SETUP_RETRIES - 1) {
            await new Promise((resolve) => setTimeout(resolve, 5e3));
          }
        }
      }
      if (!setupSuccess) {
        sendLog(null, `Lỗi khởi tạo lô, vui lòng Đăng nhập lại.`, "error");
        this.promptsToProcess.forEach((p) => sendLog(p.id, "Lỗi khởi tạo lô, vui lòng Đăng nhập lại.", "error"));
        this.onHalfComplete();
        this.onAllPromptsSettled();
        return;
      }
      let completedOrFailedCount = 0;
      let halfCompleteCalled = false;
      const triggerPoint = Math.min(2, this.promptsToProcess.length);
      const tasks = this.promptsToProcess.map(
        (prompt) => this.processPromptWithRetries(prompt, initialProjectId, initialCookie).finally(() => {
          if (stopAutomationFlag) return;
          completedOrFailedCount++;
          if (completedOrFailedCount === triggerPoint && !halfCompleteCalled) {
            halfCompleteCalled = true;
            sendLog(null, `Đã xử lý ...`, "running");
            this.onHalfComplete();
          }
        })
      );
      await Promise.all(tasks);
      this.onAllPromptsSettled();
    }
  }
  const runQueueManager = async () => {
    const mainPromptQueue = [...prompts];
    const totalPromptsToProcess = mainPromptQueue.length;
    let totalPromptsSettled = 0;
    const maxParallelProjects = Math.ceil(concurrentStreams / PROMPTS_PER_PROJECT);
    let activeProjects = 0;
    sendLog(null, `Bắt đầu xử lý.`, "running");
    const launchNextBatch = () => {
      if (stopAutomationFlag || activeProjects >= maxParallelProjects || mainPromptQueue.length === 0) {
        return;
      }
      activeProjects++;
      const batch = mainPromptQueue.splice(0, PROMPTS_PER_PROJECT);
      sendLog(null, `Ktlm.`, "running");
      const onHalfComplete = () => {
        activeProjects--;
        sendLog(null, `Đang tạo video.`, "running");
        launchNextBatch();
      };
      const onAllPromptsSettled = () => {
        totalPromptsSettled += batch.length;
        sendLog(null, `Hoàn thành.`, "running");
        if (totalPromptsToProcess === totalPromptsSettled) {
          if (!stopAutomationFlag) {
            sendLog(null, "===== Đã xử lý tất cả prompt! =====", "finished");
          }
        }
        if (batch.length < 2 && activeProjects === 0) {
          launchNextBatch();
        }
      };
      const processor2 = new ProjectProcessor(batch, authToken, onHalfComplete, onAllPromptsSettled);
      processor2.run();
    };
    for (let i = 0; i < maxParallelProjects; i++) {
      launchNextBatch();
    }
    if (totalPromptsToProcess === 0) {
      sendLog(null, "Không có prompt nào để xử lý.", "finished");
    }
  };
  runQueueManager();
});
require$$1$3.ipcMain.handle("select-video-files", async (event) => {
  const mainWindow2 = require$$1$3.BrowserWindow.fromWebContents(event.sender);
  if (!mainWindow2) return null;
  const { canceled, filePaths } = await require$$1$3.dialog.showOpenDialog(mainWindow2, {
    title: "Chọn các file video",
    properties: ["openFile", "multiSelections"],
    filters: [{ name: "Videos", extensions: ["mp4"] }]
  });
  if (canceled || filePaths.length === 0) {
    return null;
  }
  return filePaths.map((p) => p.replace(/\\/g, "/"));
});
require$$1$3.ipcMain.handle("merge-videos", async (event, { videoPaths, savePath }) => {
  const mainWindow2 = require$$1$3.BrowserWindow.fromWebContents(event.sender);
  if (!mainWindow2) return { success: false, error: "Main window not found" };
  let outputPath = "";
  if (savePath) {
    outputPath = path.join(savePath, `merged-video-${Date.now()}.mp4`);
  } else {
    const { canceled, filePath } = await require$$1$3.dialog.showSaveDialog(mainWindow2, {
      title: "Lưu video đã ghép",
      defaultPath: `merged-video-${Date.now()}.mp4`,
      filters: [{ name: "MP4 Videos", extensions: ["mp4"] }]
    });
    if (canceled || !filePath) {
      return { success: false, error: "Hủy lưu file" };
    }
    outputPath = filePath;
  }
  return new Promise((resolve) => {
    ffmpegCommand = ffmpeg();
    const fileListPath = path.join(require$$1$3.app.getPath("temp"), `filelist-${Date.now()}.txt`);
    const fileContent = videoPaths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n");
    fs$1.writeFileSync(fileListPath, fileContent);
    ffmpegCommand.input(fileListPath).inputOptions(["-f", "concat", "-safe", "0"]).outputOptions("-c", "copy").on("progress", (progress) => {
      if (mainWindow2 && !mainWindow2.isDestroyed()) {
        mainWindow2.webContents.send("merge-progress", progress);
      }
    }).on("error", (err, stdout, stderr) => {
      console.error("FFmpeg error:", err.message);
      console.error("FFmpeg stderr:", stderr);
      const userCancelled = err.message.includes("SIGKILL");
      ffmpegCommand = null;
      try {
        fs$1.unlinkSync(fileListPath);
      } catch (e) {
      }
      resolve({ success: false, error: userCancelled ? "Hủy ghép" : `Lỗi FFmpeg: ${err.message}.` });
    }).on("end", () => {
      console.log("FFmpeg finished successfully.");
      ffmpegCommand = null;
      try {
        fs$1.unlinkSync(fileListPath);
      } catch (e) {
      }
      resolve({ success: true, path: outputPath });
    }).save(outputPath);
  });
});
require$$1$3.ipcMain.handle("stop-merge", async () => {
  if (ffmpegCommand) {
    try {
      ffmpegCommand.kill("SIGKILL");
      ffmpegCommand = null;
      console.log("FFmpeg process stopped by user.");
      return { success: true };
    } catch (e) {
      console.error("Error stopping ffmpeg:", e);
      return { success: false, error: "Failed to stop process." };
    }
  }
  return { success: false, error: "Không có quá trình ghép nào đang chạy." };
});
const uploadImage = async (mainWindow2, rawImageBytes, cookie, promptId, sessionId, logChannel = "browser:log") => {
  if (mainWindow2 && !mainWindow2.isDestroyed()) {
    mainWindow2.webContents.send(logChannel, { promptId, message: "Đang tải ảnh lên...", status: "submitting" });
  }
  if (!rawImageBytes || typeof rawImageBytes !== "string" || rawImageBytes.length < 100) {
    throw new Error("Dữ liệu ảnh (base64) không hợp lệ hoặc bị trống.");
  }
  const uploadResponse = await handleApiRequest(null, {
    url: "https://aisandbox-pa.googleapis.com/v1:uploadUserImage",
    cookie,
    options: {
      method: "POST",
      body: {
        "imageInput": { "rawImageBytes": rawImageBytes, "isUserUploaded": true, "mimeType": "image/jpeg" },
        "clientContext": { "sessionId": sessionId, "tool": "ASSET_MANAGER" }
      }
    }
  });
  const mediaId = uploadResponse?.mediaGenerationId?.mediaGenerationId;
  if (!mediaId) {
    console.error(`[${promptId || "general"}] Failed to get mediaId from upload response:`, uploadResponse);
    throw new Error("Không thể lấy mediaId sau khi tải ảnh lên.");
  }
  if (mainWindow2 && !mainWindow2.isDestroyed()) {
    mainWindow2.webContents.send(logChannel, { promptId, message: `Tải ảnh lên thành công...`, status: "submitting" });
  }
  return mediaId;
};
const processSingleFramePromptInBatch = async (mainWindow2, prompt, projectId, cookie, aspectRatio, autoSaveConfig) => {
  const sendLog = (promptId, message, status, videoUrl = null, operationName = null, sceneId = null, mediaId = null, projectId2 = null, cookie2 = null) => {
    if (mainWindow2 && !mainWindow2.isDestroyed()) {
      mainWindow2.webContents.send("browser:log", { promptId, message, status, videoUrl, operationName, sceneId, mediaId, projectId: projectId2, cookie: cookie2 });
    }
    console.log(`[${promptId || "general"}] ${message}`);
  };
  let startMediaId = null;
  let endMediaId = null;
  try {
    if (!prompt.startImageBase64) throw new Error("Cần có ảnh Bắt đầu.");
    if (!prompt.text || typeof prompt.text !== "string" || prompt.text.trim() === "") throw new Error("Nội dung Prompt không được để trống.");
    const sessionId = `;${Date.now()}`;
    startMediaId = await uploadImage(mainWindow2, prompt.startImageBase64, cookie, prompt.id, sessionId + "-start", "browser:log");
    if (prompt.endImageBase64) {
      endMediaId = await uploadImage(mainWindow2, prompt.endImageBase64, cookie, prompt.id, sessionId + "-end", "browser:log");
    }
    sendLog(prompt.id, `Bắt đầu tạo video...`, "submitting");
    const clientGeneratedSceneId = `client-generated-uuid-${Date.now()}-${Math.random()}`;
    let url;
    let videoModelKey;
    let requestDetails;
    let clientContext = { "projectId": projectId, "tool": "PINHOLE", "userPaygateTier": "PAYGATE_TIER_TWO" };
    if (endMediaId) {
      url = "https://aisandbox-pa.googleapis.com/v1/video:batchAsyncGenerateVideoStartAndEndImage";
      videoModelKey = aspectRatio === "PORTRAIT" ? "veo_3_1_i2v_s_portrait_fl" : "veo_3_1_i2v_s_fl";
      requestDetails = {
        "startImage": { "mediaId": startMediaId },
        "endImage": { "mediaId": endMediaId },
        "aspectRatio": `VIDEO_ASPECT_RATIO_${aspectRatio.toUpperCase()}`,
        "seed": Math.floor(Math.random() * 1e5),
        "textInput": { "prompt": prompt.text.trim() },
        "metadata": { "sceneId": clientGeneratedSceneId },
        "videoModelKey": videoModelKey
      };
    } else {
      url = "https://aisandbox-pa.googleapis.com/v1/video:batchAsyncGenerateVideoStartImage";
      videoModelKey = aspectRatio === "PORTRAIT" ? "veo_3_1_i2v_s_portrait" : "veo_3_1_i2v_s";
      requestDetails = {
        "startImage": { "mediaId": startMediaId },
        "aspectRatio": `VIDEO_ASPECT_RATIO_${aspectRatio.toUpperCase()}`,
        "seed": Math.floor(Math.random() * 1e5),
        "textInput": { "prompt": prompt.text.trim() },
        "metadata": { "sceneId": clientGeneratedSceneId },
        "videoModelKey": videoModelKey
      };
    }
    const requestBody = { "clientContext": clientContext, "requests": [requestDetails] };
    const generateResponse = await handleApiRequest(null, { url, cookie, options: { method: "POST", body: requestBody } });
    const operation = generateResponse?.operations?.[0];
    if (!operation?.operation?.name || !operation?.sceneId) {
      console.error(`[${prompt.id}] Invalid generate response:`, generateResponse);
      throw new Error("Không lấy được operation/scene ID từ API tạo video.");
    }
    sendLog(prompt.id, `Đang tạo video...`, "processing", null, operation.operation.name, operation.sceneId, null, projectId, cookie);
    while (!stopAutomationFlag) {
      await new Promise((resolve) => setTimeout(resolve, STATUS_CHECK_INTERVAL));
      if (stopAutomationFlag) break;
      sendLog(prompt.id, "Đang kiểm tra trạng thái video...", "processing");
      const statusResponse = await handleApiRequest(null, {
        url: "https://aisandbox-pa.googleapis.com/v1/video:batchCheckAsyncVideoGenerationStatus",
        cookie,
        options: { method: "POST", body: { operations: [[{ operation: { name: operation.operation.name }, sceneId: operation.sceneId }]] } }
      });
      if (!statusResponse || !Array.isArray(statusResponse.operations) || statusResponse.operations.length === 0) {
        console.error(`[${prompt.id}] Invalid status response structure:`, statusResponse);
        throw new Error("Cấu trúc phản hồi trạng thái không hợp lệ.");
      }
      const operationResult = statusResponse.operations[0];
      const apiStatus = (operationResult?.status || "UNKNOWN_STATUS").replace("MEDIA_GENERATION_STATUS_", "").toLowerCase();
      sendLog(prompt.id, `Trạng thái: ${apiStatus}`, "processing");
      if (operationResult?.status === "MEDIA_GENERATION_STATUS_SUCCESSFUL") {
        const videoMetadata = operationResult?.operation?.metadata?.video;
        if (!videoMetadata || !videoMetadata.fifeUrl && !videoMetadata.servingBaseUri) {
          console.error(`[${prompt.id}] Success status but no video URL found:`, operationResult);
          throw new Error("Tạo thành công nhưng không tìm thấy URL video.");
        }
        const videoUrl = videoMetadata.fifeUrl || videoMetadata.servingBaseUri;
        const mediaId = videoMetadata.mediaGenerationId;
        sendLog(prompt.id, "Hoàn thành!", "success", videoUrl, operation.operation.name, operation.sceneId, mediaId, projectId, cookie);
        if (autoSaveConfig.enabled && autoSaveConfig.path && videoUrl) {
          const dlResult = await downloadFile(mainWindow2, videoUrl, prompt.text, autoSaveConfig.path, prompt.originalIndex, autoSaveConfig);
          sendLog(prompt.id, dlResult.success ? "Đã lưu!" : `Lỗi lưu: ${dlResult.error}`, dlResult.success ? "success" : "error", videoUrl);
        }
        return;
      } else if (operationResult?.status === "MEDIA_GENERATION_STATUS_FAILED") {
        const errorMessage = operationResult?.error?.message || "Lỗi không xác định từ Veo khi tạo video.";
        console.error(`[${prompt.id}] API Video Creation Failure Details:`, operationResult?.error);
        throw new Error(errorMessage);
      } else if (operationResult?.status === "MEDIA_GENERATION_STATUS_UNSPECIFIED" || !operationResult?.status) {
        console.warn(`[${prompt.id}] Trạng thái video không xác định từ API:`, operationResult);
      }
    }
    if (stopAutomationFlag) {
      sendLog(prompt.id, `Đã dừng bởi người dùng`, "idle");
    }
  } catch (error2) {
    let errorMessage = error2.message;
    if (errorMessage === "Nội dung Prompt không được để trống." || errorMessage === "Cần có ảnh Bắt đầu.") {
      sendLog(prompt.id, `Lỗi: ${errorMessage}`, "error");
    } else if (error2.message.includes("mediaId")) {
      sendLog(prompt.id, `Lỗi tải ảnh lên: ${errorMessage}`, "error");
    } else if (error2.statusCode === 500) {
      errorMessage = `Lỗi máy chủ (${error2.message}). Thử lại...`;
      sendLog(prompt.id, `Lỗi: ${errorMessage}`, "error");
    } else {
      sendLog(prompt.id, `Lỗi: ${errorMessage}`, "error");
    }
    if (errorMessage !== "Nội dung Prompt không được để trống." && errorMessage !== "Cần có ảnh Bắt đầu.") {
      throw error2;
    }
  }
};
const downloadVideoToPath = async (url, filePath) => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch video: ${response.statusText}`);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs$1.promises.writeFile(filePath, buffer);
    return filePath;
  } catch (error2) {
    console.error(`Download to path error (${filePath}):`, error2);
    throw new Error(`Lỗi tải file tạm: ${error2.message}`);
  }
};
const extractLastFrame = (videoPath, outputPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath).inputOptions("-sseof", "-0.1").outputOptions("-vframes", "1").save(outputPath).on("end", () => {
      console.log(`Đã trích xuất frame cuối: ${outputPath}`);
      resolve(outputPath);
    }).on("error", (err) => {
      console.error("FFmpeg Lỗi trích xuất frame:", err);
      reject(new Error(`FFmpeg Lỗi trích xuất frame: ${err.message}`));
    });
  });
};
const convertImageToBase64 = async (imagePath) => {
  try {
    const buffer = await fs$1.promises.readFile(imagePath);
    return buffer.toString("base64");
  } catch (error2) {
    console.error("Lỗi chuyển ảnh sang base64:", error2);
    throw new Error(`Lỗi đọc file frame: ${error2.message}`);
  }
};
const mergeVideosInternal = (videoPaths, outputPath) => {
  return new Promise((resolve, reject) => {
    const fileListPath = path.join(require$$1$3.app.getPath("temp"), `extended-filelist-${Date.now()}.txt`);
    const fileContent = videoPaths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n");
    fs$1.writeFileSync(fileListPath, fileContent);
    console.log(`Đang ghép ${videoPaths.length} video vào ${outputPath}`);
    ffmpeg().input(fileListPath).inputOptions(["-f", "concat", "-safe", "0"]).outputOptions("-c", "copy").save(outputPath).on("end", () => {
      try {
        fs$1.unlinkSync(fileListPath);
      } catch (e) {
      }
      console.log("Ghép video thành công.");
      resolve(outputPath);
    }).on("error", (err) => {
      try {
        fs$1.unlinkSync(fileListPath);
      } catch (e) {
      }
      console.error("Lỗi ghép video :", err);
      reject(new Error(` Lỗi ghép video: ${err.message}`));
    });
  });
};
const runT2V_Sequential = async (prompt, projectId, cookie, model, aspectRatio, sendLog) => {
  let promptTextForApi;
  try {
    if (!prompt.text || typeof prompt.text !== "string" || prompt.text.trim() === "") {
      throw new Error("Nội dung Prompt không được để trống.");
    }
    try {
      const promptObj = JSON.parse(prompt.text);
      promptTextForApi = promptObj.prompt || promptObj.text;
      if (!promptTextForApi || typeof promptTextForApi !== "string" || promptTextForApi.trim() === "") {
        throw new Error("Không tìm thấy trường 'prompt'/'text' hợp lệ trong JSON.");
      }
      promptTextForApi = promptTextForApi.trim();
    } catch (e) {
      promptTextForApi = prompt.text.trim();
    }
  } catch (e) {
    sendLog(prompt.id, `Lỗi: ${e.message}`, "error");
    throw e;
  }
  const modelKey = model;
  if (stopExtendedVideoFlag) throw new Error("Đã dừng");
  try {
    sendLog(prompt.id, `Đang tạo ...`, "submitting");
    const clientGeneratedSceneId = `client-generated-uuid-${Date.now()}-${Math.random()}`;
    const requestBody = {
      "clientContext": { "projectId": projectId, "tool": "PINHOLE" },
      "requests": [{
        "aspectRatio": `VIDEO_ASPECT_RATIO_${aspectRatio.toUpperCase()}`,
        "seed": Math.floor(Math.random() * 1e5),
        "textInput": { "prompt": promptTextForApi },
        "videoModelKey": aspectRatio === "PORTRAIT" ? "veo_3_1_t2v_portrait" : modelKey,
        "metadata": { "sceneId": clientGeneratedSceneId }
      }]
    };
    const generateResponse = await handleApiRequest(null, {
      url: "https://aisandbox-pa.googleapis.com/v1/video:batchAsyncGenerateVideoText",
      cookie,
      options: { method: "POST", body: requestBody }
    });
    const operation = generateResponse?.operations?.[0];
    if (!operation?.operation?.name || !operation?.sceneId) throw new Error("Không lấy được operation/scene ID (T2V).");
    sendLog(prompt.id, `Video đang được xử lý..`, "processing");
    while (!stopExtendedVideoFlag) {
      await new Promise((resolve) => setTimeout(resolve, STATUS_CHECK_INTERVAL));
      if (stopExtendedVideoFlag) break;
      sendLog(prompt.id, "Đang kiểm tra ...", "processing");
      const statusResponse = await handleApiRequest(null, {
        url: "https://aisandbox-pa.googleapis.com/v1/video:batchCheckAsyncVideoGenerationStatus",
        cookie,
        options: { method: "POST", body: { operations: [[{ operation: { name: operation.operation.name }, sceneId: operation.sceneId }]] } }
      });
      const opResult = statusResponse?.operations?.[0];
      if (!opResult) throw new Error("Cấu trúc phản hồi trạng thái T2V không hợp lệ.");
      const apiStatus = (opResult?.status || "UNKNOWN_STATUS").replace("MEDIA_GENERATION_STATUS_", "").toLowerCase();
      if (opResult?.status === "MEDIA_GENERATION_STATUS_SUCCESSFUL") {
        const videoMetadata = opResult?.operation?.metadata?.video;
        const videoUrl = videoMetadata?.fifeUrl || videoMetadata?.servingBaseUri;
        const mediaId = videoMetadata?.mediaGenerationId;
        if (!videoUrl || !mediaId) {
          throw new Error("Tạo T2V thành công nhưng không tìm thấy URL/MediaId.");
        }
        sendLog(prompt.id, `T2V Thành công!`, "processing");
        return { videoUrl, mediaId };
      } else if (opResult?.status === "MEDIA_GENERATION_STATUS_FAILED") {
        const errorMessage = opResult?.error?.message || "Lỗi T2V không xác định từ Veo.";
        throw new Error(errorMessage);
      } else {
        sendLog(prompt.id, `Trạng thái : ${apiStatus}`, "processing");
      }
    }
    if (stopExtendedVideoFlag) throw new Error("Đã dừng");
  } catch (processingError) {
    sendLog(prompt.id, `Không tạo được: ${processingError.message}`, "error");
    throw processingError;
  }
  throw new Error("Lỗi T2V không xác định.");
};
const runI2V_Sequential = async (prompt, projectId, cookie, startImageBase64, aspectRatio, sendLog) => {
  let promptTextForApi;
  try {
    if (!prompt.text || typeof prompt.text !== "string" || prompt.text.trim() === "") {
      throw new Error("Nội dung Prompt không được để trống.");
    }
    if (!startImageBase64) {
      throw new Error("Không có ảnh đầu vào cho Video.");
    }
    try {
      const promptObj = JSON.parse(prompt.text);
      promptTextForApi = promptObj.prompt || promptObj.text;
      if (!promptTextForApi || typeof promptTextForApi !== "string" || promptTextForApi.trim() === "") {
        throw new Error("Không tìm thấy trường 'prompt'/'text' hợp lệ trong JSON.");
      }
      promptTextForApi = promptTextForApi.trim();
    } catch (e) {
      promptTextForApi = prompt.text.trim();
    }
  } catch (e) {
    sendLog(prompt.id, `Lỗi: ${e.message}`, "error");
    throw e;
  }
  if (stopExtendedVideoFlag) throw new Error("Đã dừng");
  try {
    sendLog(prompt.id, `Đang tải ảnh...`, "submitting");
    const sessionId = `;${Date.now()}`;
    const startMediaId = await uploadImage(mainWindow, startImageBase64, cookie, prompt.id, sessionId + "-start", "extended-video:log");
    sendLog(prompt.id, `Đang tạo Video...`, "submitting");
    const clientGeneratedSceneId = `client-generated-uuid-${Date.now()}-${Math.random()}`;
    const url = "https://aisandbox-pa.googleapis.com/v1/video:batchAsyncGenerateVideoStartImage";
    const videoModelKey = aspectRatio === "PORTRAIT" ? "veo_3_1_i2v_s_portrait" : "veo_3_1_i2v_s";
    const requestDetails = {
      "startImage": { "mediaId": startMediaId },
      "aspectRatio": `VIDEO_ASPECT_RATIO_${aspectRatio.toUpperCase()}`,
      "seed": Math.floor(Math.random() * 1e5),
      "textInput": { "prompt": promptTextForApi },
      "metadata": { "sceneId": clientGeneratedSceneId },
      "videoModelKey": videoModelKey
    };
    const clientContext = { "projectId": projectId, "tool": "PINHOLE", "userPaygateTier": "PAYGATE_TIER_TWO" };
    const requestBody = { "clientContext": clientContext, "requests": [requestDetails] };
    const generateResponse = await handleApiRequest(null, { url, cookie, options: { method: "POST", body: requestBody } });
    const operation = generateResponse?.operations?.[0];
    if (!operation?.operation?.name || !operation?.sceneId) {
      throw new Error("Không lấy được operation/scene ID (I2V).");
    }
    sendLog(prompt.id, `Video đang được xử lý..`, "processing");
    while (!stopExtendedVideoFlag) {
      await new Promise((resolve) => setTimeout(resolve, STATUS_CHECK_INTERVAL));
      if (stopExtendedVideoFlag) break;
      sendLog(prompt.id, "Đang kiểm tra Video...", "processing");
      const statusResponse = await handleApiRequest(null, {
        url: "https://aisandbox-pa.googleapis.com/v1/video:batchCheckAsyncVideoGenerationStatus",
        cookie,
        options: { method: "POST", body: { operations: [[{ operation: { name: operation.operation.name }, sceneId: operation.sceneId }]] } }
      });
      const opResult = statusResponse?.operations?.[0];
      if (!opResult) throw new Error("Cấu trúc phản hồi trạng thái I2V không hợp lệ.");
      const apiStatus = (opResult?.status || "UNKNOWN_STATUS").replace("MEDIA_GENERATION_STATUS_", "").toLowerCase();
      if (opResult?.status === "MEDIA_GENERATION_STATUS_SUCCESSFUL") {
        const videoMetadata = opResult?.operation?.metadata?.video;
        const videoUrl = videoMetadata?.fifeUrl || videoMetadata?.servingBaseUri;
        const mediaId = videoMetadata?.mediaGenerationId;
        if (!videoUrl || !mediaId) {
          throw new Error("Tạo Video thành công nhưng không tìm thấy URL/MediaId.");
        }
        sendLog(prompt.id, `Tạo video Thành công!`, "processing");
        return { videoUrl, mediaId };
      } else if (opResult?.status === "MEDIA_GENERATION_STATUS_FAILED") {
        const errorMessage = opResult?.error?.message || "Lỗi I2V không xác định từ Veo.";
        throw new Error(errorMessage);
      } else {
        sendLog(prompt.id, `Trạng thái Video : ${apiStatus}`, "processing");
      }
    }
    if (stopExtendedVideoFlag) throw new Error("Đã dừng");
  } catch (processingError) {
    sendLog(prompt.id, `Lỗi Khi tạo: ${processingError.message}`, "error");
    throw processingError;
  }
  throw new Error("Lỗi không xác định.");
};
require$$1$3.ipcMain.on("video:create-from-frames", async (event, { prompts, authToken, aspectRatio, autoSaveConfig, currentUser, concurrentStreams }) => {
  const mainWindow2 = require$$1$3.BrowserWindow.fromWebContents(event.sender);
  if (!mainWindow2) return;
  if (!currentUser || !currentUser.subscription || new Date(currentUser.subscription.end_date) < /* @__PURE__ */ new Date()) {
    const title = !currentUser || !currentUser.subscription ? "Yêu Cầu Nâng Cấp" : "Gói Đã Hết Hạn";
    const message = !currentUser || !currentUser.subscription ? "Bạn cần nâng cấp gói để sử dụng tính năng này." : "Gói đăng ký của bạn đã hết hạn.";
    require$$1$3.dialog.showMessageBox(mainWindow2, { type: "warning", title, message });
    mainWindow2.webContents.send("navigate-to-view", "packages");
    return;
  }
  stopAutomationFlag = false;
  const PROMPTS_PER_PROJECT = 4;
  const MAX_COOKIE_RETRIES = 5;
  const MAX_SETUP_RETRIES = 3;
  const sendLog = (promptId, message, status, videoUrl = null, operationName = null, sceneId = null, mediaId = null, projectId = null, cookie = null) => {
    if (mainWindow2 && !mainWindow2.isDestroyed()) {
      mainWindow2.webContents.send("browser:log", { promptId, message, status, videoUrl, operationName, sceneId, mediaId, projectId, cookie });
    }
    console.log(`[${promptId || "general"}] ${message}`);
  };
  class FrameProjectProcessor {
    constructor(prompts2, authToken2, onHalfComplete, onAllPromptsSettled, aspectRatio2) {
      this.promptsToProcess = prompts2;
      this.authToken = authToken2;
      this.onHalfComplete = onHalfComplete;
      this.onAllPromptsSettled = onAllPromptsSettled;
      this.aspectRatio = aspectRatio2;
    }
    async processPromptWithRetries(prompt, initialProjectId, initialCookie) {
      if (!prompt.text || typeof prompt.text !== "string" || prompt.text.trim() === "") {
        sendLog(prompt.id, `Lỗi: Nội dung Prompt không được để trống. Bỏ qua prompt này.`, "error");
        return false;
      }
      if (!prompt.startImageBase64) {
        sendLog(prompt.id, `Lỗi: Cần có ảnh bắt đầu. Bỏ qua prompt này.`, "error");
        return false;
      }
      let currentCookie = initialCookie;
      let currentProjectId = initialProjectId;
      for (let cookieAttempt = 0; cookieAttempt < MAX_COOKIE_RETRIES; cookieAttempt++) {
        if (stopAutomationFlag) return false;
        if (cookieAttempt > 0) {
          try {
            sendLog(prompt.id, `Dtlvckm...`, "running");
            const cookieResponse = await fetch("https://mmoreal.com/api/prf.php", { headers: { "Authorization": `Bearer ${this.authToken}` } });
            const cookieData = await cookieResponse.json();
            if (!cookieData.success) throw new Error("Không thể lấy cookie mới.");
            currentCookie = cookieData.cookie;
            const createProjectResponse = await handleApiRequest(null, {
              url: "https://labs.google/fx/api/trpc/project.createProject",
              cookie: currentCookie,
              options: { method: "POST", body: { json: { projectTitle: `Veo Frame Batch (Retry ${cookieAttempt}) - ${Date.now()}`, toolName: "PINHOLE" } } }
            });
            currentProjectId = createProjectResponse?.result?.data?.json?.result?.projectId;
            if (!currentProjectId) throw new Error("Không thể tạo project mới.");
            sendLog(prompt.id, `Dcprjm: ${currentProjectId}`, "running");
          } catch (e) {
            sendLog(prompt.id, `Dlckm: ${e.message}`, "error");
            await new Promise((resolve) => setTimeout(resolve, 5e3));
            continue;
          }
        }
        try {
          await processSingleFramePromptInBatch(mainWindow2, prompt, currentProjectId, currentCookie, this.aspectRatio, autoSaveConfig);
          return true;
        } catch (processingError) {
          if (processingError.message !== "Nội dung Prompt không được để trống." && processingError.message !== "Cần có ảnh Bắt đầu.") {
            sendLog(prompt.id, `Dtlvckm...`, "running");
          } else {
            return false;
          }
        }
      }
      sendLog(prompt.id, `Tạo video thất bại.`, "error");
      return false;
    }
    async run() {
      let initialCookie = null;
      let initialProjectId = null;
      let setupSuccess = false;
      for (let setupAttempt = 0; setupAttempt < MAX_SETUP_RETRIES; setupAttempt++) {
        if (stopAutomationFlag) break;
        try {
          sendLog(null, `Dktl...`, "running");
          const cookieResponse = await fetch("https://mmoreal.com/api/prf.php", { headers: { "Authorization": `Bearer ${this.authToken}` } });
          const cookieData = await cookieResponse.json();
          if (!cookieData.success) throw new Error("Không thể lấy cookie.");
          initialCookie = cookieData.cookie;
          const createProjectResponse = await handleApiRequest(null, {
            url: "https://labs.google/fx/api/trpc/project.createProject",
            cookie: initialCookie,
            options: { method: "POST", body: { json: { projectTitle: `Veo Frame Batch - ${Date.now()}`, toolName: "PINHOLE" } } }
          });
          initialProjectId = createProjectResponse?.result?.data?.json?.result?.projectId;
          if (!initialProjectId) throw new Error("Không thể tạo project.");
          sendLog(null, `Ktltc: ${initialProjectId}.`, "running");
          setupSuccess = true;
          break;
        } catch (setupError) {
          sendLog(null, `Lỗi khởi tạo lô, vui lòng Đăng nhập lại: ${setupError.message}`, "error");
          if (setupAttempt < MAX_SETUP_RETRIES - 1) await new Promise((resolve) => setTimeout(resolve, 5e3));
        }
      }
      if (!setupSuccess) {
        sendLog(null, `Không thể khởi tạo lô, Vui lòng đăng nhập lại.`, "error");
        this.promptsToProcess.forEach((p) => sendLog(p.id, "Lỗi khởi tạo lô, không thể tiếp tục.", "error"));
        this.onHalfComplete();
        this.onAllPromptsSettled();
        return;
      }
      let completedOrFailedCount = 0;
      let halfCompleteCalled = false;
      const triggerPoint = Math.min(2, this.promptsToProcess.length);
      const tasks = this.promptsToProcess.map(
        (prompt) => this.processPromptWithRetries(prompt, initialProjectId, initialCookie).finally(() => {
          if (stopAutomationFlag) return;
          completedOrFailedCount++;
          if (completedOrFailedCount === triggerPoint && !halfCompleteCalled) {
            halfCompleteCalled = true;
            sendLog(null, `Đã xử lý...`, "running");
            this.onHalfComplete();
          }
        })
      );
      await Promise.all(tasks);
      this.onAllPromptsSettled();
    }
  }
  const runQueueManager = async () => {
    const mainPromptQueue = [...prompts];
    const totalPromptsToProcess = mainPromptQueue.length;
    let totalPromptsSettled = 0;
    const maxParallelProjects = Math.ceil(concurrentStreams / PROMPTS_PER_PROJECT);
    let activeProjects = 0;
    sendLog(null, `Bắt đầu xử lý.`, "running");
    const launchNextBatch = () => {
      if (stopAutomationFlag || activeProjects >= maxParallelProjects || mainPromptQueue.length === 0) {
        return;
      }
      activeProjects++;
      const batch = mainPromptQueue.splice(0, PROMPTS_PER_PROJECT);
      sendLog(null, `Ktlm.`, "running");
      const onHalfComplete = () => {
        activeProjects--;
        sendLog(null, `Giải phóng luồng. Đang chạy: ${activeProjects}.`, "running");
        launchNextBatch();
      };
      const onAllPromptsSettled = () => {
        totalPromptsSettled += batch.length;
        sendLog(null, `Hoàn thành lô. Tổng: ${totalPromptsSettled}/${totalPromptsToProcess}.`, "running");
        if (totalPromptsSettled === totalPromptsToProcess) {
          sendLog(null, stopAutomationFlag ? "===== Xử lý (từ frame) đã dừng =====" : "===== Đã xử lý tất cả prompt (từ frame)! =====", "finished");
        }
        if (batch.length < 2 && activeProjects === 0) {
          launchNextBatch();
        }
      };
      const processor2 = new FrameProjectProcessor(batch, authToken, onHalfComplete, onAllPromptsSettled, aspectRatio);
      processor2.run();
    };
    for (let i = 0; i < maxParallelProjects; i++) launchNextBatch();
    if (totalPromptsToProcess === 0) sendLog(null, "Không có prompt nào để xử lý.", "finished");
  };
  runQueueManager();
});
require$$1$3.ipcMain.on("extended-video:stop", () => {
  console.log("Received stop extended video signal.");
  stopExtendedVideoFlag = true;
});
const sendExtendedLog = (promptId, message, status, videoUrl = null) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("extended-video:log", {
      promptId,
      message,
      status,
      videoUrl
    });
  }
  console.log(`[ExtendedVideo ${promptId || "general"}] ${message}`);
};
require$$1$3.ipcMain.on("extended-video:start", async (event, { prompts, authToken, model, aspectRatio, autoSaveConfig, currentUser, useInitialImage, initialImageBase64 }) => {
  if (!mainWindow) return;
  if (!currentUser || !currentUser.subscription || new Date(currentUser.subscription.end_date) < /* @__PURE__ */ new Date()) {
    const message = !currentUser?.subscription ? "Bạn cần nâng cấp gói." : "Gói đăng ký đã hết hạn.";
    require$$1$3.dialog.showMessageBox(mainWindow, { type: "warning", title: "Yêu Cầu Nâng Cấp", message });
    mainWindow.webContents.send("navigate-to-view", "packages");
    return;
  }
  stopExtendedVideoFlag = false;
  let initialCookie = null;
  let initialProjectId = null;
  const tempDir = path.join(require$$1$3.app.getPath("temp"), `veo-extended-${Date.now()}`);
  const tempVideoPaths = [];
  let lastFrameBase64 = useInitialImage ? initialImageBase64 : null;
  try {
    await fs$1.promises.mkdir(tempDir, { recursive: true });
    sendExtendedLog(null, "Đang lấy cookie và project...", "running");
    try {
      const cookieResponse = await fetch("https://mmoreal.com/api/prf.php", { headers: { "Authorization": `Bearer ${authToken}` } });
      const cookieData = await cookieResponse.json();
      if (!cookieData.success) throw new Error("Không thể lấy cookie.");
      initialCookie = cookieData.cookie;
      const createProjectResponse = await handleApiRequest(null, {
        url: "https://labs.google/fx/api/trpc/project.createProject",
        cookie: initialCookie,
        options: { method: "POST", body: { json: { projectTitle: `Veo Extended - ${Date.now()}`, toolName: "PINHOLE" } } }
      });
      initialProjectId = createProjectResponse?.result?.data?.json?.result?.projectId;
      if (!initialProjectId) throw new Error("Không thể tạo project.");
    } catch (setupError) {
      sendExtendedLog(null, `Lỗi khởi tạo: ${setupError.message}`, "error");
      throw setupError;
    }
    if (stopExtendedVideoFlag) throw new Error("Đã dừng");
    for (const prompt of prompts) {
      if (stopExtendedVideoFlag) throw new Error("Đã dừng bởi người dùng.");
      sendExtendedLog(prompt.id, "Bắt đầu...", "running");
      let generatedVideoUrl = null;
      const currentTempVideoPath = path.join(tempDir, `segment_${prompt.originalIndex}.mp4`);
      const currentFramePath = path.join(tempDir, `frame_${prompt.originalIndex}.png`);
      if (prompt.originalIndex === 0) {
        if (useInitialImage) {
          if (!lastFrameBase64) {
            throw new Error("Lỗi: 'Sử dụng ảnh input' được bật nhưng không có ảnh nào được cung cấp.");
          }
          const { videoUrl } = await runI2V_Sequential(
            prompt,
            initialProjectId,
            initialCookie,
            lastFrameBase64,
            aspectRatio,
            sendExtendedLog
          );
          generatedVideoUrl = videoUrl;
        } else {
          const { videoUrl } = await runT2V_Sequential(
            prompt,
            initialProjectId,
            initialCookie,
            model,
            aspectRatio,
            sendExtendedLog
          );
          generatedVideoUrl = videoUrl;
        }
      } else {
        if (!lastFrameBase64) {
          throw new Error(`Lỗi nội bộ: Thiếu frame cuối từ prompt #${prompt.originalIndex}.`);
        }
        const { videoUrl } = await runI2V_Sequential(
          prompt,
          initialProjectId,
          initialCookie,
          lastFrameBase64,
          aspectRatio,
          sendExtendedLog
        );
        generatedVideoUrl = videoUrl;
      }
      if (!generatedVideoUrl) throw new Error("Không nhận được URL video từ hàm xử lý.");
      sendExtendedLog(prompt.id, "Đang tải video tạm...", "downloading");
      await downloadVideoToPath(generatedVideoUrl, currentTempVideoPath);
      tempVideoPaths.push(currentTempVideoPath);
      sendExtendedLog(prompt.id, "Tải tạm xong, đang trích xuất...", "processing", `file://${currentTempVideoPath}`);
      await extractLastFrame(currentTempVideoPath, currentFramePath);
      lastFrameBase64 = await convertImageToBase64(currentFramePath);
      sendExtendedLog(prompt.id, "Hoàn thành phân cảnh!", "success", `file://${currentTempVideoPath}`);
    }
    if (stopExtendedVideoFlag) throw new Error("Đã dừng trước khi ghép.");
    if (tempVideoPaths.length === 0) throw new Error("Không có video nào để ghép.");
    if (tempVideoPaths.length !== prompts.length) throw new Error("Số lượng video tạm không khớp số prompt, đã có lỗi xảy ra.");
    sendExtendedLog(null, "Đang ghép video...", "processing");
    let finalOutputPath;
    if (autoSaveConfig.enabled && autoSaveConfig.path) {
      const finalSaveDirectory = autoSaveConfig.path;
      if (!fs$1.existsSync(finalSaveDirectory)) {
        fs$1.mkdirSync(finalSaveDirectory, { recursive: true });
      }
      const finalFilename = `Extended_${Date.now()}.mp4`;
      finalOutputPath = path.join(finalSaveDirectory, finalFilename);
      if (fs$1.existsSync(finalOutputPath) && !autoSaveConfig.allowOverwrite) {
        try {
          fs$1.unlinkSync(finalOutputPath);
        } catch (e) {
        }
      } else if (fs$1.existsSync(finalOutputPath) && autoSaveConfig.allowOverwrite) {
        finalOutputPath = path.join(finalSaveDirectory, `Extended_${Date.now()}_${Math.floor(Math.random() * 1e3)}.mp4`);
      }
    } else {
      sendExtendedLog(null, "Tự động lưu đang tắt. Video cuối cùng sẽ bị xóa.", "error");
      throw new Error("Tự động lưu đang tắt.");
    }
    await mergeVideosInternal(tempVideoPaths, finalOutputPath);
    sendExtendedLog(null, `Ghép thành công!`, "finished", finalOutputPath);
  } catch (error2) {
    console.error("Lỗi quy trình video mở rộng:", error2);
    sendExtendedLog(null, `Lỗi: ${error2.message}`, "finished");
  } finally {
    try {
      if (fs$1.existsSync(tempDir)) {
        await fs$1.promises.rm(tempDir, { recursive: true, force: true });
        console.log(`Đã dọn dẹp thư mục tạm: ${tempDir}`);
      }
    } catch (cleanupError) {
      console.error("Không thể dọn dẹp thư mục tạm:", cleanupError);
    }
  }
});
mainExports.autoUpdater.autoDownload = false;
mainExports.autoUpdater.autoInstallOnAppQuit = true;
function sendUpdateMessage(window2, message, data = null) {
  if (window2 && !window2.isDestroyed()) {
    window2.webContents.send("update-message", message, data);
  }
}
function createWindow() {
  const primaryDisplay = require$$1$3.screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  mainWindow = new require$$1$3.BrowserWindow({
    width,
    height,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
      devTools: isDev,
      webSecurity: !isDev
    }
  });
  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
    mainWindow.once("ready-to-show", () => {
      mainExports.autoUpdater.checkForUpdatesAndNotify();
    });
  }
  mainExports.autoUpdater.on("update-available", (info) => {
    sendUpdateMessage(mainWindow, "update-available", info);
    mainExports.autoUpdater.downloadUpdate();
  });
  mainExports.autoUpdater.on("update-not-available", (info) => {
    sendUpdateMessage(mainWindow, "update-not-available", info);
  });
  mainExports.autoUpdater.on("download-progress", (progressObj) => {
    sendUpdateMessage(mainWindow, "download-progress", progressObj);
  });
  mainExports.autoUpdater.on("update-downloaded", (info) => {
    sendUpdateMessage(mainWindow, "update-downloaded", info);
  });
  mainExports.autoUpdater.on("error", (err) => {
    sendUpdateMessage(mainWindow, "error", err.message);
  });
}
require$$1$3.app.whenReady().then(() => {
  require$$1$3.session.defaultSession.protocol.registerFileProtocol("file", (request, callback) => {
    const filePath = decodeURI(request.url.replace("file:///", ""));
    callback(filePath);
  });
  if (!isDev) {
    require$$1$3.session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          "Content-Security-Policy": ["script-src 'self'; media-src 'self' file:;"]
        }
      });
    });
  }
  require$$1$3.ipcMain.handle("fetch-api", handleApiRequest);
  createWindow();
});
require$$1$3.ipcMain.on("restart-and-install", () => {
  mainExports.autoUpdater.quitAndInstall();
});
require$$1$3.ipcMain.on("app:force-reload-window", () => {
  if (mainWindow) {
    mainWindow.webContents.reloadIgnoringCache();
  }
});
require$$1$3.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") require$$1$3.app.quit();
});
require$$1$3.app.on("activate", () => {
  if (require$$1$3.BrowserWindow.getAllWindows().length === 0) createWindow();
});
