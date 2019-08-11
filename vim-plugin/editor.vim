if v:version < 801
    echoe 'nibblrjr editor requires vim 8.1'
    finish
else

let s:jspath = expand('<sfile>:p:h')
let s:help="nibblrjr command editor - o:open a:add D:delete
         \\n-----------------------------------------------"
let s:helpLines = 2

" command NibblrList call NibblrList()

function! NibblrList()
    enew
    put=s:help
    keepjumps normal ggddG
    silent execute 'read! node ' . s:jspath . '/list'
    keepjumps normal gg

    let &modified = 0
    setlocal buftype=nofile
    if v:version > 800
        return trim(a:input)
    else
    setlocal noswapfile
    setlocal nowrap
    setlocal nomodifiable
    noremap <buffer> <silent> o :call NibblrGet()<cr>
    noremap <buffer> <silent> a :call NibblrAdd()<cr>
    noremap <buffer> <silent> D :call NibblrDelete()<cr>
endfunction

call NibblrList() " TODO: remove

function! NibblrGet()
    if line('.') > s:helpLines
        let l:name = getline('.')

        if bufwinnr(l:name) > 0
            enew
            silent execute 'file ' . l:name
        else
            silent execute 'edit ' . l:name
            keepjumps normal ggdG
        endif

        put = system('node ' . s:jspath . '/get', l:name)
        keepjumps normal ggdd
        let &modified = 0
        setlocal filetype=javascript
        setlocal buftype=acwrite
        setlocal noswapfile
        autocmd! BufWriteCmd <buffer> call NibblrSet()
    endif
endfunction

function! NibblrSet()
    let l:name = expand('%')
    let l:buf = join(getline(1, '$'), "\n")
    echo trim(system('node ' . s:jspath . '/set', l:name . ' ' . l:buf))
    let &modified = 0
endfunction

function! NibblrDelete()
    let l:name = getline('.')
    let l:choice = confirm('are you sure you want to delete ' . l:name, "&Ok\n&Cancel")
    if line('.') > s:helpLines && l:choice == 1
        silent let l:out = trim(system('node ' . s:jspath . '/delete', l:name))
        if v:shell_error == 0
            setlocal modifiable
            normal dd
            setlocal nomodifiable
        else
            echo l:out
        endif
    endif
endfunction

function! NibblrAdd()
    let l:name = input('new command name: ')
    " hack to clear the input prompt
    normal :<ESC>
    silent let l:out = trim(system('node ' . s:jspath . '/add', l:name))
    if v:shell_error == 0
        setlocal modifiable
        put=l:name
        setlocal nomodifiable
    else
        echo l:out
    endif
endfunction

" ? / ~ commands
" message locked / starred
" syntax
" s - vsplit
" namespace commands
" http request
" json_encode
