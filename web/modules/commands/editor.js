import React, { Component } from 'react';

import ace from 'brace';
import 'brace/keybinding/vim';
import 'brace/mode/javascript';
import 'brace/theme/tomorrow_night_eighties';

// container for copied text
const textarea = document.body.appendChild(document.createElement('textarea'));
textarea.style.left = '-999px';
textarea.style.position = 'absolute';

const uuid = (() => {
    let count = 0;
    return () => (++count).toString(36);
})();

export class Editor extends Component {

    id = uuid();

    state = { vim: false, storedText: '' };

    toggleVim = (e) => {
        this.setState({vim: e.target.checked});
    };

    onRef = (node) => {
        if (node) {
            this.editor = ace.edit(this.id);
            this.editor.session.setUseWorker(false)
            this.editor.setTheme('ace/theme/tomorrow_night_eighties');
            this.editor.getSession().setMode('ace/mode/javascript');
            this.editor.$blockScrolling = Infinity;
            this.editor.setShowPrintMargin(false);
            this.editor.setHighlightActiveLine(false);
            this.editor.setShowFoldWidgets(false);
            this.editor.renderer.setScrollMargin(10, 10, 10, 10);

            this.editor.setOptions({
                fontSize: '14px',
                maxLines: Infinity,
                wrap: true,
            });

            // enable vim mode
            this.editor.setKeyboardHandler('ace/keyboard/vim');
            ace.config.loadModule('ace/keyboard/vim', (module) => {
                var VimApi = module.CodeMirror.Vim;
                VimApi.defineEx('write', 'w', (cm, input) => {
                    this.save();
                });
                VimApi.defineEx('copy', 'c', (cm, input) => {
                    textarea.value = this.editor.getValue();
                    textarea.select();
                    document.execCommand('copy');
                    textarea.value = '';
                });
            });
            // editor.setKeyboardHandler(null);

            //     editor.getSession().on('change', (e) => {
            //         if (!this.externalEdit) {
            //             store[accessor] = editor.getValue();
            //         }
            //     });
        }
    };

    setText = (text) => {
        const pos = this.editor.getCursorPosition();
        this.editor.setValue(text);
        this.editor.clearSelection();
        this.editor.moveCursorToPosition(pos);
    };

    componentWillMount() {
        this.commandID = `COMMANDS.${this.props.command.name}`;
        this.props.ws.msg.on(this.commandID, (obj) => {
            if (obj.info && obj.info.name == this.props.command.name) {
                this.setText(obj.info.commandData);
            }
        });
        this.getInfo();
    }

    componentWillUnmount() {
        this.props.ws.msg.on(this.commandID, null);
    }

    getInfo = () => {
        this.props.ws.sendObj('COMMANDS', {
            getInfo: this.props.command.name,
        });
    };

    save = () => {
        this.props.ws.sendObj('COMMANDS', {
            setCommand: {
                name: this.props.command.name,
                commandData: this.editor.getValue(),
            },
        });
    };

    // legacy stuff

    legacy = () => {
        this.setText(`print.raw(( // legacy command wrapper
   ${this.editor.getValue()}
)(input, input.split(' '), IRC.message));`);
    };

    legacyStr = () => {
        this.setText(`print(${this.editor.getValue()});`);
    };

    wget = () => {
        this.setText(`const wget = (url, callback) => {
    getText(url).then(d => print(callback(null, d))).catch(print.log);
};

${this.editor.getValue()}`);
    };

    getDOM = () => {
        this.setText(`getDOM('')
.then(dom => {
    dom.qs('')
})
.catch(print.log);
${this.editor.getValue()}`);
    };

// if (!input) {
//     print('{r}~usa <input>')
// }
// else {
//     getDOM("http://textart.io/figlet?text="+input+"&font=usaflag")
//         .then(dom => {
//             print(dom.qs('pre').textContent.replace(/\s*$/g,''))
//         })
//         .catch(print.log)
// }

    render() {
        const { vim } = this.state;

        return (
            <div className="editor">
                <pre>{JSON.stringify(this.props.command)}</pre>
                <div id={this.id} ref={this.onRef}/>
                <button type="button" onClick={this.save}>
                    save
                </button>
                <br />
                <button type="button">
                    lock / unlock (!)
                </button>
                <br />
                <button type="button" onClick={this.legacy}>
                    add legacy wrapper
                </button>
                <br />
                <button type="button" onClick={this.legacyStr}>
                    add legacy (string) wrapper
                </button>
                <br />
                <button type="button" onClick={this.asyncWrap}>
                    async closure wrapper
                </button>
                <br />
                <button type="button" onClick={this.wget}>
                    add wget polyfill
                </button>
                <br />

                <button type="button" onClick={this.getDOM}>
                    getDOM
                </button>
                <br />
                <button type="button" onClick={this.getInfo}>
                    refetch original
                </button>
            </div>
        );
    }

}
