" local prototype json editor for vim
" see https://github.com/kirjavascript/nibblrjr.vim

if v:version < 801
    echoe 'nibblrjr editor requires vim 8.1'
    finish
endif

let s:jspath = expand('<sfile>:p:h')
let s:help="nibblrjr command editor - o:open a:add D:delete
         \\n-----------------------------------------------"
let s:helpLines = 2

" command NibblrList call NibblrList()

function! NibblrList()
    enew
    put=s:help
    keepjumps normal! ggddG
    silent execute 'read! node ' . s:jspath . '/list'
    keepjumps normal! gg

    let &modified = 0
    setlocal buftype=nofile
    setlocal noswapfile
    setlocal nowrap
    setlocal nomodifiable

    set filetype=nibblrjr
    syntax match Comment /\%2l-/
    syntax match Type /★/
    syntax match Include /🔒/
    syntax match Operator /^\(\S*\) /
    syntax match String /\%1lnibblr/
    syntax match Constant /\%1ljr/
    syntax match Type /\%1l\(\S\):/

    noremap <buffer> <silent> o :call NibblrGet()<cr>
    noremap <buffer> <silent> a :call NibblrAdd()<cr>
    noremap <buffer> <silent> D :call NibblrDelete()<cr>
endfunction

call NibblrList() " TODO: remove

function! NibblrGet()
    if line('.') > s:helpLines
        let l:name = getline('.')
        " strip everything after the first space
        let l:name = substitute(l:name, " .*", "", "")

        if bufwinnr(l:name) > 0
            enew
            silent execute 'file ' . l:name
        else
            silent execute 'edit ' . l:name
            keepjumps normal! ggdG
        endif

        put = system('node ' . s:jspath . '/get', l:name)
        keepjumps normal! ggdd
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
    if line('.') > s:helpLines && confirm('are you sure you want to delete ' . l:name, "&Ok\n&Cancel") == 1
        silent let l:out = trim(system('node ' . s:jspath . '/delete', l:name))
        if v:shell_error == 0
            setlocal modifiable
            normal! dd
            setlocal nomodifiable
        else
            echo l:out
        endif
    endif
endfunction

function! NibblrAdd()
    let l:name = input('new command name: ')
    " hack to clear the input prompt
    normal! :<ESC>
    silent let l:out = trim(system('node ' . s:jspath . '/add', l:name))
    if v:shell_error == 0
        setlocal modifiable
        put=l:name
        setlocal nomodifiable
    else
        echo l:out
    endif
endfunction
