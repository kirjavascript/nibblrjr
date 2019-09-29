import React, { useState, useEffect, useRef } from 'react';
import CM from 'codemirror';
import 'codemirror/mode/jsx/jsx';

export default function Editor({ value = '', onChange, children, readOnly }) {
    const ref = useRef();
    const valueRef = useRef();
    const editorRef = useRef();
    // const
    useEffect(() => {
        const editor = CM(ref.current, {
            value: value,
            mode:  'jsx',
            theme: 'mdn-like',
            autofocus: true,
            lineWrapping: true,
            inputStyle: 'contenteditable',
            lineNumbers: true,
            gutters: ['CodeMirror-linenumbers', 'breakpoints'],
        });

        valueRef.current = value;
        editorRef.current = editor;
    }, []);

    useEffect(() => {
        function handler(_, [{ origin }]) {
            const code = editorRef.current.getValue();
            if (origin !== 'setValue') {
                onChange(code);
            }
            valueRef.current = code;
        }
        editorRef.current.on('changes', handler);
        return () => {
            editorRef.current.off('changes', handler);
        };
    }, [onChange]);

    useEffect(() => {
        editorRef.current.setOption('readOnly', readOnly);
    }, [readOnly]);

    useEffect(() => {
        if (valueRef.current !== value) {
            editorRef.current.setValue(value);
        }
    }, [value]);

    return (
        <div ref={ref} className="cmd-editor">
            {children}
        </div>
    );
}
