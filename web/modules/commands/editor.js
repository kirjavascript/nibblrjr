import React, { Component } from 'react';

import ace from 'brace';
import 'brace/keybinding/vim';
import 'brace/mode/javascript';
import 'brace/theme/tomorrow_night_eighties';

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
            this.editor.renderer.setScrollMargin(5, 5, 5, 5);

            this.editor.setOptions({
                fontSize: '14px',
                maxLines: Infinity,
                wrap: true,
            });

            // enable vim mode
            this.editor.setKeyboardHandler('ace/keyboard/vim');
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

    componentDidMount() {
        this.commandID = `COMMANDS.${this.props.command.name}`;
        this.props.ws.msg.on(this.commandID, (obj) => {
            if (obj.info && obj.info.name == this.props.command.name) {
                this.setText(obj.info.commandData);
            }
        });
        this.props.ws.sendObj('COMMANDS', {
            getInfo: this.props.command.name,
        });
    }

    componentWillUnmount() {
        this.props.ws.msg.on(this.commandID, null);
    }

    render() {
        const { vim } = this.state;

        return (
            <div>
                <pre>{JSON.stringify(this.props.command)}</pre>
                <div id={this.id} ref={this.onRef}/>
                <button type="button">
                    save
                </button>
                <br />
                <button type="button">
                    lock / unlock
                </button>
                <br />
                <button type="button">
                    add legacy wrapper
                </button>
                <br />
                <button type="button">
                    add wget polyfill
                </button>
            </div>
        );
    }

}
