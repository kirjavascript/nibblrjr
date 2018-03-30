import React, { Component } from 'react';
import { env } from '#store';
import { autorun } from 'mobx';
import { observer } from 'mobx-react';

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

@observer
export class Editor extends Component {

    id = uuid();

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

            this.setVim(env.editor.vimMode);

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
        }
    };

    setText = (text) => {
        const pos = this.editor.getCursorPosition();
        this.editor.setValue(text);
        this.editor.clearSelection();
        this.editor.moveCursorToPosition(pos);
    };

    setVim = (bool) => {
        this.editor.setKeyboardHandler(bool ? 'ace/keyboard/vim' : null);
    };

    toggleVim = (e) => {
        env.editor.vimMode = !env.editor.vimMode;
        this.setVim(env.editor.vimMode);
    };

    componentWillMount() {
        this.disposer = autorun(() => {
            const { command } = env.editor;
            this.editor &&
            this.setText(env.editor.command);
        });
    }

    componentDidMount() {
        env.getCommand(this.props.command);
    }

    componentWillUnmount() {
        this.disposer && this.disposer();
    }

    save = () => {
        env.setCommand(this.props.command, this.editor.getValue());
    };

    delete = () => {
        env.deleteCommand(this.props.command);
        this.props.delete();
    };

    toggleStar = () => {
        env.setConfig(this.props.command, {starred: !env.editor.starred});
    };

    toggleLock = () => {
        env.setConfig(this.props.command, {locked: !env.editor.locked});
    };

    render() {
        const { vimMode, locked, starred } = env.editor;
        const { admin } = env;

        return (
            <div className="editor">
                    <pre>
                        {JSON.stringify(env.editor, null, 4)}
                    </pre>
                <div className="flex items-stretch items-grow">
                    <input
                        type="text"
                        disabled
                        defaultValue={this.props.command}
                    />
                    <button
                        type="button"
                        onClick={this.save}
                        disabled={locked && !admin}
                    >
                        save
                    </button>
                    <button
                        type="button"
                        disabled={!admin}
                        onClick={this.toggleLock}
                    >
                        {locked ? 'unlock' : 'lock'}
                    </button>
                    <button
                        type="button"
                        disabled={!admin}
                        onClick={this.toggleStar}
                    >
                        {starred ? 'unstar' : 'star'}
                    </button>
                    <button
                        type="button"
                        onClick={this.delete}
                        disabled={locked && !admin}
                    >
                        delete
                    </button>
                    <button type="button" onClick={this.toggleVim}>
                        {!vimMode ? 'vim keys' : 'normal keys'}
                    </button>
                </div>
                <div id={this.id} ref={this.onRef}/>
            </div>
        );
    }

}
