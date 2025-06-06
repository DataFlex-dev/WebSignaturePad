/*
Class:
    sp.WebSignaturePad
Extends:
    df.WebBaseControl

Class that represents a web control for the DataFlex WebApp Framework. It wraps the signaturepad 
control that allows signatures to be made and send to the server. This signature control needs to be 
included into the page separately. See http://szimek.github.io/signature_pad for more details on 
this control.

Note that this control is provided as is and no official support / maintenance will be provided.
    
Revision:
    2025/06/06  (HW, DAW)
        Converted to ES6 class syntax.
    2015/03/30  (HW, DAW) 
        Initial version developed as a sample for Synergy 2015.
*/

if(!sp){
    var sp = {};
}


/*
The constructor method defines properties and events. The 'prop' function is used to define web 
properties. The 'event' function defines events. Private properties usually start with a '_'.

@param  sName       The object name as a string.
@param  oParent     Reference to the parent object.
*/
sp.WebSignaturePad = class WebSignaturePad extends df.WebBaseControl {
    
constructor(sName, oParent){
    //  Forward Send
    super(sName, oParent);
    
    this.prop(df.tString, "psPenColor", "rgba(0,0,0,1)");
    
    this.prop(df.tInt, "piImageWidth", 0);
    this.prop(df.tInt, "piImageHeight", 0);
    
    this.event("OnBegin", df.cCallModeDefault);
    this.event("OnEnd", df.cCallModeWait);

    //  Determine CSS classname for outermost div
    this._sControlClass = "WebSignaturePad";
}


/*
The openHtml method is called by the render method to generate the opening HTML. In a lot of cases 
you would open HTML elements. The HTML generation is split up into an openHtml and a closeHtml 
method to provide more flexibility during inheritance. The aHtml parameter passed is an array that 
is used as a string builder. HTML code can be added using the push method.

@param  aHtml   String builder array to be filled with HTML.
*/
openHtml(aHtml){
    //  Forward Send (before so base class can add wrapping elements)
    super.openHtml(aHtml);
    
    //  Generate the canvas element and a wrapping div for it
    aHtml.push('<div class="CanvasWrap" style="overflow:hidden;"><canvas></canvas></div>');
}

/*
The closeHtml method s called by the render method to generate the closing HTML. In most cases you 
would close the HTML element here.

@param  aHtml   String builder array to be filled with HTML.
*/
closeHtml(aHtml){
    //  Forward Send (after so base class can add wrapping elements
    super.closeHtml(aHtml);
}

/*
The afterRender method is called by the render method after the HTML is parsed by the browser. It 
gives a chance to get references to the DOM elements and to do first manipulation. This is also the 
place where you would attach event listeners. It is common practice to manually execute some of the 
setter methods here to do further initialization.
*/
afterRender(){
    //  Get references to DOM elements
    this._eControl = df.dom.query(this._eElem, ".CanvasWrap");
    this._eCanvas = df.dom.query(this._eElem, "canvas");

    //  Forward Send
    super.afterRender();

    //  Set the size of the canvas based on either piImageHeight & piImageWidth or if these are 0 the surrounding div sized by the framework
    //  Note that a canvas needs a specified size to function properly.
    if(this.piImageWidth <= 0){
        this._eCanvas.width = this._eControl.clientWidth - df.sys.gui.getHorizBoxDiff(this._eControl, 1);
    }else{
        this._eCanvas.width = this.piImageWidth;
    }
    if(this.piImageHeight <= 0){
        this._eCanvas.height = (this._iLastHeight = this._eControl.clientHeight) - df.sys.gui.getVertBoxDiff(this._eControl, 2);
    }else{
        this._eCanvas.height = this.piImageHeight;
    }
    
    this.initSignaturePad();
}

/* 
This function initializes the SignaturePad javascript control passing it the canvas element and the 
initial property settings as parameter. Also passed are event wrappers that are using a closure to 
maintain a reference to the this object.
*/
initSignaturePad(){
    var that = this;
    
    this._oSignaturePad = new SignaturePad(this._eCanvas, {
        penColor : this.psPenColor,
        onBegin(){ that.fire("OnBegin"); },
        onEnd(){ that.fire("OnEnd"); }
    });
}

/* 
This function is called by the framework when the size changes. This can be a window resize but also 
the initialization or a different control that changed it size. The WebBaseControl will make sure 
that the element in the this._eControl property gets its height according to piHeight and 
pbFillHeight.

If the image size is not explicitly specified with piImageHeight and piImageWidth then it uses the 
this._eControl dimensions to size the canvas.
*/
resize(){
    var sSignature, bEmpty, iW, iH;
   
    super.resize()
    
    if(this._eCanvas){  
        bEmpty = this._oSignaturePad.isEmpty();
        
        //  Check if we need to set the canvas size (it might be fixed)
        if(this.piImageWidth <= 0 || this.piImageHeight <= 0){
            iW = this._eControl.clientWidth;
            iH = this._eControl.clientHeight;
            
            //  Check if the size changed since last time (as changing it is a bit expensive)
            if(this._iLastWidth !== iW || this._iLastHeight !== iH){
                this._iLastWidth = iW;
                this._iLastHeight = iH;
                
                //  Read the signature
                if(!bEmpty){
                    sSignature = this._oSignaturePad.toDataURL()
                }
                
                //  Resize
                if(this.piImageWidth <= 0){
                    this._eCanvas.width = iW - df.sys.gui.getHorizBoxDiff(this._eCanvas, 1);    //  Take a possible border on the canvas into account
                }
                if(this.piImageHeight <= 0){
                    this._eCanvas.height = iH - df.sys.gui.getVertBoxDiff(this._eCanvas, 1);
                }
                
                //  Put the signature back (as resizing the canvas clears the image
                if(!bEmpty){
                    this._oSignaturePad.fromDataURL(sSignature);
                }
            }
        }
    }
}

/* 
This function is called from the server when it wants to get the image data. It sends a new 
serverAction that gets the image data retrieved from the signaturepad control as a parameter. This 
pattern is used for big pieces of data to prevent them from being sent back and forth all the time.

@client-action
*/
processSignature(){
    var sSignature;
    
    if(this._oSignaturePad){
        sSignature = this._oSignaturePad.toDataURL();
    }
    
    this.serverAction("OnProcessSignature", [ sSignature ]);
}

/* 
This function is called from the server to clear the signature pad area.

@client-action
*/
clearSignature(){
    if(this._oSignaturePad){
        this._oSignaturePad.clear();
    }
}

/* 
This is a setter function for psPenColor and it is called by the framework if a WebSet of psPenColor 
is performed.
*/
set_psPenColor(sVal){
    if(this._oSignaturePad){
        this._oSignaturePad.penColor = sVal;
    }
}

};
