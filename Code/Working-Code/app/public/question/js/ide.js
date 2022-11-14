let editor;

const cppTemplate = "#include <iostream>\nusing namespace std;\nint main()\n{\n    cout << \"Hello CPP!\";\n    return 0;\n}";
const cTemplate = "#include <stdio.h>\nint main()\n{\n    printf(\"Hello C!\");\n}";
const javaTemplate = "class Hello {\n    public static void main(String[] args) {\n        System.out.println(\"Hello Java!\");\n}";
const jsTemplate = "function hello() {\n    console.log('Hello, javascript!');\n  }\nhello();";
const pyTemplate = "print(\"Hello, Python!\")";

window.onload = function() {
    editor = ace.edit("editor");
    editor.setTheme("ace/theme/monokai");
    editor.session.setMode("ace/mode/c_cpp");
    editor.session.setUseWrapMode(true);
    editor.getSession().on("change", function () {                
        document.getElementById("code").value = editor.getSession().getValue();
    });
    editor.setValue(cppTemplate);
    editor.clearSelection(); 
}

function changeLanguage(languages) {

    let language = languages.value;

    if(language == 'c') {
        editor.session.setMode("ace/mode/c_cpp");
        editor.setValue(cTemplate);
        editor.clearSelection(); 
    }
    else if(language == 'cpp') {
        editor.session.setMode("ace/mode/c_cpp");
        editor.setValue(cppTemplate);
        editor.clearSelection(); 
    }
    else if(language == 'java') {
        editor.session.setMode("ace/mode/java");
        editor.setValue(javaTemplate);
        editor.clearSelection(); 
    }
    else if(language == 'python3') {
        editor.session.setMode("ace/mode/python");
        editor.setValue(pyTemplate);
        editor.clearSelection(); 
    }
    else if(language == 'js') {
        editor.session.setMode("ace/mode/javascript");
        editor.setValue(jsTemplate);
        editor.clearSelection(); 
    }
}

async function runCodefun() {

    const code = $("#code").val();
    const lang = $("#languages").val();
    const input0 = $("#input0").val();
    const input1 = $("#input1").val();
    const inputsArr = [input0, input1];
    
    for(var i = 0; i < inputsArr.length; i++) {

        try {
            const { data } = await axios.post('http://localhost:7000/submit', {
            src: code,
            stdin: inputsArr[i],
            lang: lang,
            timeout: 5
            });
            
            document.getElementsByName(`output${i}`)[0].id = new String(data.data).substring(data.data.lastIndexOf('/') + 1);
            document.getElementsByName(`output${i}span`)[0].id = (new String(data.data).substring(data.data.lastIndexOf('/') + 1)) + "span";

            // poll here
            let pollInterval;
            pollInterval = setInterval(async () => {
                const { data: statusRes } = await axios.get(data.data);
                const { status } = statusRes;
                if(status == "Queued") {
                    document.getElementById(new String(data.data).substring(data.data.lastIndexOf('/') + 1)).innerHTML = "Your Program is in Queue";
                    return;
                }
                else if(status == "Processing") {
                    document.getElementById(new String(data.data).substring(data.data.lastIndexOf('/') + 1)).innerHTML = "Your Program is Processing";
                    return;
                }
                else if(status == "error") {
                    document.getElementById(new String(data.data).substring(data.data.lastIndexOf('/') + 1)).innerHTML = `Error : ${statusRes.error.message}`;
                    clearInterval(pollInterval);
                }
                else if(statusRes.data.status == "success\n") {
                    document.getElementById(new String(data.data).substring(data.data.lastIndexOf('/') + 1) + "span").innerHTML = " Successful Executed!";
                    document.getElementById(new String(data.data).substring(data.data.lastIndexOf('/') + 1)).innerHTML = statusRes.data.output;
                    document.getElementById("inputdisable").disabled = false;
                    clearInterval(pollInterval);
                }
                else if(statusRes.data.status == "error\n") {
                    document.getElementById(new String(data.data).substring(data.data.lastIndexOf('/') + 1) + "span").innerHTML = " Error while Executing!";
                    document.getElementById(new String(data.data).substring(data.data.lastIndexOf('/') + 1)).innerHTML = statusRes.data.stderr;
                    document.getElementById("inputdisable").disabled = true;
                    clearInterval(pollInterval);
                }
                else if(statusRes.data.status == "timeout\n") {
                    document.getElementById(new String(data.data).substring(data.data.lastIndexOf('/') + 1) + "span").innerHTML = " Timeout Error";
                    document.getElementById(new String(data.data).substring(data.data.lastIndexOf('/') + 1)).innerHTML = statusRes.data.output;
                    document.getElementById("inputdisable").disabled = true;
                    clearInterval(pollInterval);
                }
                else {
                    document.getElementById(new String(data.data).substring(data.data.lastIndexOf('/') + 1) + "span").innerHTML = " Server Side Error";
                    document.getElementById(new String(data.data).substring(data.data.lastIndexOf('/') + 1)).innerHTML = "You should not get this!";
                    document.getElementById("inputdisable").disabled = true;
                    clearInterval(pollInterval);
                }
    
            }, 1000);
    
        } catch (err) {
            console.log(err);
        }
    }

}


async function runCustomCode(soln, langIn) {

    const code = $("#code").val();
    const lang = $("#languages").val();
    const input = $("#custominput").val();
    const solution = soln.substring(1, soln.length - 1);


    try {

        // custom output
        const { data } = await axios.post('http://localhost:7000/submit', {
        src: code,
        stdin: input,
        lang: lang,
        timeout: 5
        });
    
        let pollCusInterval;
        pollCusInterval = setInterval(async () => {
            const { data: customRes } = await axios.get(data.data);
            const { status } = customRes;
            if(status == "Queued") {
                document.getElementById("customoutput").innerHTML = "Your Program is in Queue";
                return;
            }
            else if(status == "Processing") {
                document.getElementById("customoutput").innerHTML = "Your Program is Processing";
                return;
            }
            else if(status == "error") {
                document.getElementById("customoutput").innerHTML = `Error : ${customRes.error.message}`;
                clearInterval(pollCusInterval);
            }
            else if(customRes.data.status == "success\n") {
                document.getElementById("customoutputspan").innerHTML = " Successful Executed!";
                document.getElementById("customoutput").innerHTML = customRes.data.output;
                clearInterval(pollCusInterval);
            }
            else if(customRes.data.status == "error\n") {
                document.getElementById("customoutputspan").innerHTML = " Error while Executing!";
                document.getElementById("customoutput").innerHTML = customRes.data.stderr;
                clearInterval(pollCusInterval);
            }
            else if(customRes.data.status == "timeout\n") {
                document.getElementById("customoutputspan").innerHTML = " Timeout Error";
                document.getElementById("customoutput").innerHTML = customRes.data.output;
                clearInterval(pollCusInterval);
            }
            else {
                document.getElementById("customoutputspan").innerHTML = " Server Side Error";
                document.getElementById("customoutput").innerHTML = "You should not get this!";
                clearInterval(pollCusInterval);
            }

        }, 1000);


        // Expected output
        const { data : expdata } = await axios.post('http://localhost:7000/submit', {
        src: solution,
        stdin: input,
        lang: langIn,
        timeout: 5
        });
    
        let pollExpInterval;
        pollExpInterval = setInterval(async () => {
            const { data: statusRes } = await axios.get(expdata.data);
            const { status : expstatus } = statusRes;
            if(expstatus == "Queued") {
                document.getElementById("expoutput").innerHTML = "Your Program is in Queue";
                return;
            }
            else if(expstatus == "Processing") {
                document.getElementById("expoutput").innerHTML = "Your Program is Processing";
                return;
            }
            else {
                if(expstatus == "error") {
                    document.getElementById("expoutput").innerHTML = `Error : ${statusRes.error.message}`;
                }
                else if(statusRes.data.status == "success\n") {
                    document.getElementById("expoutput").innerHTML = statusRes.data.output;

                    if(document.getElementById("expoutput").innerHTML.trim() == document.getElementById("customoutput").innerHTML.trim()) {
                        document.getElementById("expoutputspan").innerHTML = " Output Matched!";
                    } else {
                        document.getElementById("expoutputspan").innerHTML = " Output didn't Match!";
                    }
                }
                else if(statusRes.data.status == "error\n") {
                    document.getElementById("expoutputspan").innerHTML = " Error while Executing!";
                    document.getElementById("expoutput").innerHTML = statusRes.data.stderr;
                }
                else if(statusRes.data.status == "timeout\n") {
                    document.getElementById("expoutputspan").innerHTML = " Timeout Error";
                    document.getElementById("expoutput").innerHTML = statusRes.data.output;
                }
                else {
                    document.getElementById("expoutputspan").innerHTML = " Server Side Error";
                    document.getElementById("expoutput").innerHTML = "You should not get this!";
                }
                clearInterval(pollExpInterval);
                
            }
            

        }, 1000);

    } catch (err) {
        console.log(err);
    }

}


async function runSubmitCode(testCases) {
    console.log(testCases);
}