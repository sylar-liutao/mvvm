// 创建一个  XVue  类
class Vue {
    constructor(options) {
        this.$options = options;
        this._data = options.data;
        // 数据劫持
        observe(this._data);
        // 绑定数据到 this
        this._bindData();
        // 计算属性
        initComputed.call(this);
        // 模板编译
        compile(this.$options.el, this);
    }

    _bindData() {
        for (let key in this._data) {
            Object.defineProperty(this, key, {
                get() {
                    return this._data[key];
                },
                set(newVal) {
                    this._data[key] = newVal;
                }
            });
        }
    }
}

// 实现数据劫持
function observe(data) {
    if (!data || typeof data !== "object") return;
    new Observe(data);
}

class Observe {
    constructor(data) {
        this._observe(data);
    }
    _observe(data) {
        for (let key in data) {
            let val = data[key];
            let dep = new Dep();
            observe(val);
            Object.defineProperty(data, key, {
                get() {
                    Dep.target && dep._addSub(Dep.target);
                    return val;
                },
                set(newVal) {
                    if (val !== newVal) {
                        val = newVal;
                        dep._notify();
                    }
                }
            });
        }
    }
}

// 计算属性
function initComputed() {
    let vm = this;
    let computed = vm.$options.computed;
    Object.keys(computed).forEach(key => {
        Object.defineProperty(vm, key, {
            get: typeof computed[key] === "function" ? computed[key] : computed[key].get,
            set() {}
        });
    });
}

// 模板编译
function compile(el, vm) {
    vm.$el = document.querySelector(el);
    let fragment = document.createDocumentFragment();
    while (child = vm.$el.firstChild) {
        fragment.appendChild(child);
    }

    replace(fragment);

    function replace(fragment) {
        // console.log(fragment);
        Array.from(fragment.childNodes).forEach(node => {
            let text = node.textContent;
            // console.log(node.nodeType);
            let reg = /\{\{(.*)\}\}/;
            if (node.nodeType === 3 && reg.test(text)) {
                let arr = RegExp.$1.split(".");
                // console.log(arr); // [b, c]
                let val = vm;
                arr.forEach(key => {
                    val = val[key];
                });
                new Watcher(vm, RegExp.$1, newVal => {
                    node.textContent = text.replace(reg, newVal);
                });
                node.textContent = text.replace(reg, val);
            }

            if (node.nodeType === 1) {
                // console.log(node.attributes);
                Array.from(node.attributes).forEach(attr => {
                    let name = attr.name;
                    let exp = attr.value;
                    if (name.indexOf("v-model") === 0) {
                        node.value = vm[exp];

                        new Watcher(vm, exp, newVal => {
                            node.value = newVal;
                        });

                        node.addEventListener("input", e => {
                            vm[exp] = e.target.value;
                        });
                    }
                });
            }

            if (node.childNodes) {
                replace(node);
            }
        });
    }

    vm.$el.appendChild(fragment);
}

// 发布 订阅模式
class Dep {
    constructor() {
        this.subs = [];
    }
    _addSub(sub) {
        this.subs.push(sub);
    }
    _notify() {
        this.subs.forEach(sub => sub._update());
    }
}
// 观察者
class Watcher {
    constructor(vm, exp, callback) {
        this.vm = vm;
        this.exp = exp;
        this.callback = callback;
        Dep.target = this;
        this._getValue();
        Dep.target = null;
    }
    _update() {
        this.callback(this._getValue());
    }
    _getValue() {
        let val = this.vm;
        let arr = this.exp.split(".");
        arr.forEach(key => {
            val = val[key];
        });
        return val;
    }
}