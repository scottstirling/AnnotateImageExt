// ----------------------------------------------------------------------------
// PixInsight JavaScript Runtime API - PJSR Version 2.0
// ----------------------------------------------------------------------------
// AnnotateImageDialog.js - Released 2026-05-11T18:30:06Z
// ----------------------------------------------------------------------------
//
// This file is part of AnnotateImage script version 2.3.1
//
// Copyright (c) 2013-2026 Andres del Pozo
// Copyright (c) 2019-2026 Juan Conejero (PTeam)
//
// The use of this source code is governed by the PixInsight Class Library
// License Version 2.0, which can be found in the LICENSE file included with
// this distribution, as well as at:
// https://pixinsight.com/license/PCL-License-2.0.html
// ----------------------------------------------------------------------------

var AnnotateDialog = class extends Dialog
{
   static AddLayerDialog = class extends Dialog
   {
      layers = [];

      constructor( parent )
      {
         super( parent );

         this.information_Label = new Label( this );
         this.information_Label.text = "Select the layer class to add:"

         this.addLayer_List = new TreeBox( this );
         this.addLayer_List.alternateRowColor = false;
         this.addLayer_List.multipleSelection = false;
         this.addLayer_List.headerVisible = true;
         this.addLayer_List.numberOfColumns = 2;
         this.addLayer_List.setHeaderText( 0, "Layer Class" );
         this.addLayer_List.setHeaderText( 1, "Description" );
         this.addLayer_List.rootDecoration = false;
         this.addLayer_List.setMinSize( this.logicalPixelsToPhysical( 550 ), this.font.pixelSize*30 );
         for ( let i = 0; i < LayerRegistry.length; ++i )
         {
            let node = new TreeBoxNode( this.addLayer_List );
            let layer = LayerRegistry.newLayer( i );
            node.layerIndex = i;
            node.checkable = false;
            node.setText( 0, layer.layerName );
            node.setText( 1, layer.layerDescription );
         }
         this.addLayer_List.adjustColumnWidthToContents( 0 );

         // Buttons

         this.ok_Button = new PushButton( this );
         this.ok_Button.defaultButton = true;
         this.ok_Button.text = "OK";
         this.ok_Button.icon = this.scaledResource( ":/icons/ok.png" );
         this.ok_Button.onClick = function()
         {
            let selectedNodes = this.dialog.addLayer_List.selectedNodes;
            if ( selectedNodes.length == 0 )
            {
               (new MessageBox( "<p>No layer has been selected.</p>", TITLE, StdIcon.Error, StdButton.Ok )).execute();
               return;
            }
            for ( let i = 0; i < selectedNodes.length; ++i )
               this.dialog.layers.push( LayerRegistry.newLayer( selectedNodes[i].layerIndex ) );
            this.dialog.ok();
         };

         this.cancel_Button = new PushButton( this );
         this.cancel_Button.text = "Cancel";
         this.cancel_Button.icon = this.scaledResource( ":/icons/cancel.png" );
         this.cancel_Button.onClick = function()
         {
            this.dialog.cancel();
         };

         this.buttons_Sizer = new HorizontalSizer;
         this.buttons_Sizer.spacing = 6;
         this.buttons_Sizer.addStretch();
         this.buttons_Sizer.add( this.ok_Button );
         this.buttons_Sizer.add( this.cancel_Button );

         // Global sizer
         this.sizer = new VerticalSizer;
         this.sizer.margin = 8;
         this.sizer.spacing = 6;
         this.sizer.add( this.information_Label );
         this.sizer.add( this.addLayer_List );
         this.sizer.addSpacing( 6 );
         this.sizer.add( this.buttons_Sizer );

         this.windowTitle = "Add Layer";

         this.ensureLayoutUpdated();
         this.adjustToContents();
      }
   };

   // -------------------------------------------------------------------------

   static PreviewDialog = class extends Dialog
   {
      constructor( parent, bitmap, metadata )
      {
         super( parent );

         this.previewControl = new ImageView( this, bitmap, metadata );

         this.ok_Button = new PushButton( this );
         this.ok_Button.defaultButton = true;
         this.ok_Button.text = "Close";
         this.ok_Button.icon = this.scaledResource( ":/icons/close.png" );
         this.ok_Button.onClick = function()
         {
            this.dialog.ok();
         };

         this.buttons_Sizer = new HorizontalSizer;
         this.buttons_Sizer.spacing = 6;
         this.buttons_Sizer.addStretch();
         this.buttons_Sizer.add( this.ok_Button );

         this.sizer = new VerticalSizer;
         this.sizer.margin = 8;
         this.sizer.spacing = 6;
         this.sizer.add( this.previewControl );
         this.sizer.addSpacing( 2 );
         this.sizer.add( this.buttons_Sizer );

         this.onClose = function()
         {
            // Deallocate bitmaps.
            this.previewControl.reset();
            return true;
         };

         this.windowTitle = "Preview Annotation";

         this.ensureLayoutUpdated();
         this.resize( this.logicalPixelsToPhysical( 800 ), this.logicalPixelsToPhysical( 800 ) );
      }
   };

   // -------------------------------------------------------------------------

   constructor( engine )
   {
      super();

      this.engine = engine;
      this.layers = this.engine.layers;

      this.labelWidth1 = this.font.width( "Small size threshold:" + 'M' );
      this.labelWidth2 = this.font.width( "Background:" );
      this.editWidth = this.font.width( "12.888" );
      this.spinWidth = this.font.width( "888888" );

      const emWidth = this.font.width( 'm' );
      const labelWidth3 = Math.round( this.font.width( "M" ) + 0.1*emWidth );
      const editWidth1 = Math.round( 4.75*emWidth );
      const editWidth2 = Math.round( 5.75*emWidth );
      const ui4 = this.logicalPixelsToPhysical( 4 );

      function toggleSectionHandler( section, toggleBegin )
      {
         if ( !toggleBegin )
         {
            section.dialog.setVariableHeight();
            section.dialog.adjustToContents();
            if ( section.dialog.layers_Section.isCollapsed() )
               section.dialog.setFixedHeight();
            else
               section.dialog.setMinHeight();
         }
      }

      // ----------------------------------------------------------------------

      this.information_Label = new Label( this );
      this.information_Label.cssId = "SCPInfoLabel";
      this.information_Label.minWidth = 45*this.font.width( 'M' );
      this.information_Label.wordWrapping = true;
      this.information_Label.useRichText = true;
      this.information_Label.text = "<p><b>" + TITLE + " version " + VERSION + "</b><br/>"
         + "Astrometry-based annotation of astronomical images.<br/>"
         + "Copyright &copy; 2012-2026 Andr&eacute;s del Pozo | &copy; 2019-2026, Juan Conejero (PTeam) | &copy; 2026, S. Stirling</p>";

      // ----------------------------------------------------------------------
      // Layers
      // ----------------------------------------------------------------------

      this.layers_TreeBox = new TreeBox( this );
      this.layers_TreeBox.alternateRowColor = false;
      this.layers_TreeBox.multipleSelection = true;
      this.layers_TreeBox.headerVisible = true;
      this.layers_TreeBox.numberOfColumns = 4;
      this.layers_TreeBox.setHeaderText( 0, "Layer" );
      this.layers_TreeBox.setHeaderText( 1, "M" );
      this.layers_TreeBox.setHeaderText( 2, "L" );
      this.layers_TreeBox.setHeaderText( 3, "Description" );
      this.layers_TreeBox.rootDecoration = false;
      this.layers_TreeBox.setMinSize( this.logicalPixelsToPhysical( 600 ), this.font.pixelSize*15 );
      this.layers_TreeBox.toolTip = "<p>Only checked layers are drawn on the output image.<br/>"
         + "The section below contains the configuration of the currently selected layer.</p>";
      this.layers_TreeBox.onCurrentNodeUpdated = function( node )
      {
         this.dialog.activateLayer( node );
      };

      this.addLayer_Button = new ToolButton( this );
      this.addLayer_Button.icon = this.scaledResource( ":/icons/add.png" );
      this.addLayer_Button.setScaledFixedSize( 24, 24 );
      this.addLayer_Button.toolTip = "<p>Add annotation layers.</p>";
      this.addLayer_Button.onMousePress = function()
      {
         this.pushed = false;
         let dlg = new AnnotateDialog.AddLayerDialog( this.dialog );
         if ( dlg.execute() )
         {
            this.dialog.layers_TreeBox.deselectAllNodes();
            let firstNewNode;
            let index = this.dialog.layers_TreeBox.childIndex( this.dialog.layers_TreeBox.currentNode );
            for ( let i = 0; i < dlg.layers.length; ++i )
            {
               let layer = dlg.layers[i];
               let node = this.dialog.addLayerToTree( layer, ++index );
               if ( i == 0 )
                  firstNewNode = node;
               node.selected = true;
            }
            this.dialog.layers_TreeBox.setNodeIntoViewport( firstNewNode );
            this.dialog.activateLayer( firstNewNode );
         }
      };

      this.deleteLayer_Button = new ToolButton( this );
      this.deleteLayer_Button.icon = this.scaledResource( ":/icons/delete.png" );
      this.deleteLayer_Button.setScaledFixedSize( 24, 24 );
      this.deleteLayer_Button.toolTip = "<p>Delete selected layers.</p>";
      this.deleteLayer_Button.onMousePress = function()
      {
         let lastRemoved = -1;
         let selectedNodes = this.dialog.layers_TreeBox.selectedNodes;
         for ( let i = 0; i < selectedNodes.length; ++i )
         {
            lastRemoved = this.dialog.layers_TreeBox.childIndex( selectedNodes[i] );
            this.dialog.layers_TreeBox.remove( lastRemoved );
         }
         if ( this.dialog.layers_TreeBox.numberOfChildren > 0 )
         {
            if ( lastRemoved >= 0 )
            {
               let nodeIdx = Math.min( lastRemoved, this.dialog.layers_TreeBox.numberOfChildren - 1 );
               this.dialog.activateLayer( this.dialog.layers_TreeBox.child( nodeIdx ) );
            }
         }
         else
            this.dialog.activateLayer( null );
      };

      this.moveUpLayer_Button = new ToolButton( this );
      this.moveUpLayer_Button.icon = this.scaledResource( ":/browser/move-up.png" );
      this.moveUpLayer_Button.setScaledFixedSize( 24, 24 );
      this.moveUpLayer_Button.toolTip = "<p>Move selected layers up.</p>";
      this.moveUpLayer_Button.onMousePress = function()
      {
         let selectedNodes = this.dialog.layers_TreeBox.selectedNodes;
         let index = [];
         for ( let i = 0; i < selectedNodes.length; ++i )
            index.push( this.dialog.layers_TreeBox.childIndex( selectedNodes[i] ) );
         index.sort( ( a, b ) => a - b );
         if ( index[0] > 0 )
         {
            for ( let i = 0; i < index.length; ++i )
               this.dialog.layers_TreeBox.move( index[i], index[i]-1 );
            this.dialog.layers_TreeBox.setNodeIntoViewport(
               this.dialog.layers_TreeBox.currentNode = this.dialog.layers_TreeBox.child( index[0]-1 ) );
            for ( let i = 0; i < index.length; ++i )
               this.dialog.layers_TreeBox.child( index[i]-1 ).selected = true;
         }
      };

      this.moveDownLayer_Button = new ToolButton( this );
      this.moveDownLayer_Button.icon = this.scaledResource( ":/browser/move-down.png" );
      this.moveDownLayer_Button.setScaledFixedSize( 24, 24 );
      this.moveDownLayer_Button.toolTip = "Move layer down";
      this.moveDownLayer_Button.onMousePress = function()
      {
         let selectedNodes = this.dialog.layers_TreeBox.selectedNodes;
         let index = [];
         for ( let i = 0; i < selectedNodes.length; ++i )
            index.push( this.dialog.layers_TreeBox.childIndex( selectedNodes[i] ) );
         index.sort( ( a, b ) => a - b ).reverse();
         if ( index[0] < this.dialog.layers_TreeBox.numberOfChildren-1 )
         {
            for ( let i = 0; i < index.length; ++i )
               this.dialog.layers_TreeBox.move( index[i], index[i]+1 );
            this.dialog.layers_TreeBox.setNodeIntoViewport(
               this.dialog.layers_TreeBox.currentNode = this.dialog.layers_TreeBox.child( index[0]+1 ) );
            for ( let i = 0; i < index.length; ++i )
               this.dialog.layers_TreeBox.child( index[i]+1 ).selected = true;
         }
      };

      this.terms_Button = new ToolButton( this );
      this.terms_Button.text = "Terms of use of VizieR data";
      this.terms_Font = new Font( this.font.family, this.font.pointSize );
      this.terms_Font.underline = true;
      this.terms_Button.font = this.terms_Font;
      this.terms_Button.onClick = function()
      {
         Dialog.openBrowser( "https://cds.unistra.fr/vizier-org/licences_vizier.html" );
      };

      this.layerButtons_Sizer = new HorizontalSizer;
      this.layerButtons_Sizer.spacing = 6;
      this.layerButtons_Sizer.add( this.addLayer_Button );
      this.layerButtons_Sizer.add( this.deleteLayer_Button );
      this.layerButtons_Sizer.addSpacing( 6 );
      this.layerButtons_Sizer.add( this.moveUpLayer_Button );
      this.layerButtons_Sizer.add( this.moveDownLayer_Button );
      this.layerButtons_Sizer.addStretch();
      this.layerButtons_Sizer.add( this.terms_Button );

      this.layers_Control = new Control( this );
      this.layers_Control.sizer = new VerticalSizer;
      this.layers_Control.sizer.spacing = 4;
      this.layers_Control.sizer.add( this.layers_TreeBox, 100 );
      this.layers_Control.sizer.add( this.layerButtons_Sizer );
      this.layers_Control.adjustToContents();
      this.layers_Control.setMinHeight();

      this.layers_Section = new SectionBar( this, "Layers" );
      this.layers_Section.setSection( this.layers_Control );
      this.layers_Section.onToggleSection = toggleSectionHandler;

      this.layerParameters_Control = new Control( this );
      this.layerParameters_Control.sizer = new VerticalSizer;

      this.layerParameters_Section = new SectionBar( this, "Layer Parameters" );
      this.layerParameters_Section.setSection( this.layerParameters_Control );
      this.layerParameters_Section.onToggleSection = toggleSectionHandler;

      this.activeFrame = null;

      for ( let i = 0; i < this.layers.length; ++i )
      {
         let node = this.addLayerToTree( this.layers[i] );
         node.selected = i == 0;
      }

      // ----------------------------------------------------------------------
      // General Properties
      // ----------------------------------------------------------------------

      this.vizierServer_Label = new Label( this );
      this.vizierServer_Label.text = "VizieR server:";
      this.vizierServer_Label.textAlignment = TextAlignment.Right | TextAlignment.VertCenter;
      this.vizierServer_Label.minWidth = this.labelWidth1;

      this.vizierServer_ComboBox = new ComboBox( this );
      this.vizierServer_ComboBox.editEnabled = false;
      for ( let m = 0; m < VizierCatalog.mirrors.length; ++m )
      {
         this.vizierServer_ComboBox.addItem( VizierCatalog.mirrors[m].name );
         if ( VizierCatalog.mirrors[m].address == this.engine.vizierServer )
            this.vizierServer_ComboBox.currentItem = parseInt( m );
      }
      this.vizierServer_ComboBox.onItemSelected = function( itemIndex )
      {
         this.dialog.engine.vizierServer = VizierCatalog.mirrors[itemIndex].address;
      };

      this.clearCache_Button = new PushButton( this );
      this.clearCache_Button.text = "Clear Cache";
      this.clearCache_Button.toolTip = "<p>Clears the catalog query cache. "
         + "This forces the script to reload all catalog data on successive server queries.</p>"
         + "<p>This is useful when there has been any problem before, which may have "
         + "caused data corruption.</p>";
      this.clearCache_Button.onMousePress = function()
      {
         if ( __vizier_cache__ )
            __vizier_cache__ = new VizierCache();
         (new MessageBox( "VizieR cache cleared", TITLE, StdIcon.Information )).execute();
      };

      this.vizierServer_Sizer = new HorizontalSizer;
      this.vizierServer_Sizer.spacing = 4;
      this.vizierServer_Sizer.add( this.vizierServer_Label );
      this.vizierServer_Sizer.add( this.vizierServer_ComboBox );
      this.vizierServer_Sizer.add( this.clearCache_Button );
      this.vizierServer_Sizer.addStretch();

      //

      this.outputMode_Label = new Label( this );
      this.outputMode_Label.text = "Output mode:";
      this.outputMode_Label.textAlignment = TextAlignment.Right | TextAlignment.VertCenter;
      this.outputMode_Label.minWidth = this.labelWidth1;

      this.outputMode_ComboBox = new ComboBox( this );
      this.outputMode_ComboBox.editEnabled = false;
      this.outputMode_ComboBox.addItem( "Annotate image" );
      this.outputMode_ComboBox.addItem( "Generate transparent overlay" );
      this.outputMode_ComboBox.addItem( "Generate SVG overlay" );
      this.outputMode_ComboBox.toolTip = "<p>The script's output can be:</p>"
         + "<ul><li><b>Annotate image</b>: Generates a new RGB image with the annotation drawn "
         + "over the original data.<br/></li>"
         + "<li><b>Generate transparent overlay</b>: Generates a new transparent image "
         + "(alpha channel) with the annotation. It can be saved e.g. in PNG or TIFF format "
         + "and be used in other applications.<br/></li>"
         + "<li><b>Generate SVG overlay</b>: Generates an SVG file with the annotation.</li></ul>";
      this.outputMode_ComboBox.currentItem = this.engine.outputMode;
      this.outputMode_ComboBox.onItemSelected = function( itemIndex )
      {
         this.dialog.engine.outputMode = itemIndex;
         this.dialog.applySTF_Control.visible = itemIndex == AnnotationEngine.OutputMode.Image;
         this.dialog.transparent_Control.visible = itemIndex == AnnotationEngine.OutputMode.Overlay;
         this.dialog.svgFile_Control.visible = itemIndex == AnnotationEngine.OutputMode.SVG;
      };

      this.applySTF_CheckBox = new CheckBox( this );
      this.applySTF_CheckBox.text = "Apply STF before annotation";
      this.applySTF_CheckBox.toolTip = "<p>Applies an STF transformation to the image before "
         + "drawing the annotation.</p>"
         + "<p>This is usually necessary when the original image is linear.</p>";
      this.applySTF_CheckBox.checked = this.engine.applySTF;
      this.applySTF_CheckBox.onCheck = function( checked )
      {
         this.dialog.engine.applySTF = checked;
      };

      this.applySTF_Control = new Control( this );
      this.applySTF_Control.sizer = new HorizontalSizer;
      this.applySTF_Control.sizer.add( this.applySTF_CheckBox );
      this.applySTF_Control.sizer.addStretch();
      this.applySTF_Control.visible = this.engine.outputMode == AnnotationEngine.OutputMode.Image;

      this.svgFile_Label = new Label( this );
      this.svgFile_Label.text = "SVG file:";
      this.svgFile_Label.textAlignment = TextAlignment.Left | TextAlignment.VertCenter;

      this.svgFile_Edit = new Edit( this );
      if ( this.engine.svgPath )
         this.svgFile_Edit.text = this.engine.svgPath;
      this.svgFile_Edit.toolTip = "<p>Path to the SVG file that will be created or rewritten.</p>";
      this.svgFile_Edit.onTextUpdated = function( text )
      {
         this.dialog.engine.svgPath = text.trim();
      };

      this.svgFile_Button = new ToolButton( this );
      this.svgFile_Button.icon = this.scaledResource( ":/icons/select-file.png" );
      this.svgFile_Button.setScaledFixedSize( 24, 24 );
      this.svgFile_Button.toolTip = "<p>Select the output SVG file path.</p>";
      this.svgFile_Button.onClick = function()
      {
         let sfd = new SaveFileDialog();
         if ( this.dialog.engine.svgPath )
            sfd.initialPath = this.dialog.engine.svgPath;
         sfd.caption = "Output SVG File";
         sfd.filters = [["SVG Files", ".svg"]];
         if ( sfd.execute() )
         {
            this.dialog.engine.svgPath = sfd.filePath;
            this.dialog.svgFile_Edit.text = sfd.filePath;
         }
      };

      this.transparent_Control = new Control( this );
      this.transparent_Control.sizer = new HorizontalSizer;
      this.transparent_Control.sizer.addStretch();
      this.transparent_Control.visible = this.engine.outputMode == AnnotationEngine.OutputMode.Overlay;

      this.svgFile_Control = new Control( this );
      this.svgFile_Control.sizer = new HorizontalSizer;
      this.svgFile_Control.sizer.spacing = 4;
      this.svgFile_Control.sizer.add( this.svgFile_Label );
      this.svgFile_Control.sizer.add( this.svgFile_Edit, 100 );
      this.svgFile_Control.sizer.add( this.svgFile_Button );
      this.svgFile_Control.visible = this.engine.outputMode == AnnotationEngine.OutputMode.SVG;
      this.svgFile_Control.onShow = function()
      {
         this.adjustToContents();
      };

      this.outputSizer = new HorizontalSizer;
      this.outputSizer.spacing = 4;
      this.outputSizer.add( this.outputMode_Label );
      this.outputSizer.add( this.outputMode_ComboBox );
      this.outputSizer.add( this.applySTF_Control );
      this.outputSizer.add( this.transparent_Control );
      this.outputSizer.add( this.svgFile_Control );

      //

      this.removeDuplicates_CheckBox = new CheckBox( this );
      this.removeDuplicates_CheckBox.text = "Remove duplicate objects";
      this.removeDuplicates_CheckBox.checked = this.engine.removeDuplicates;
      this.removeDuplicates_CheckBox.toolTip = "<p>Detect duplicate objects among selected "
         + "catalogs by coordinate proximity.</p>"
      this.removeDuplicates_CheckBox.onCheck = function( checked )
      {
         this.dialog.engine.removeDuplicates = checked;
      };

      this.removeDuplicates_Sizer = new HorizontalSizer;
      this.removeDuplicates_Sizer.spacing = 4;
      this.removeDuplicates_Sizer.addUnscaledSpacing( this.labelWidth1 + ui4 );
      this.removeDuplicates_Sizer.add( this.removeDuplicates_CheckBox );
      this.removeDuplicates_Sizer.addStretch();

      //

      this.optimizeLabelPlacement_CheckBox = new CheckBox( this );
      this.optimizeLabelPlacement_CheckBox.text = "Optimize label placement";
      this.optimizeLabelPlacement_CheckBox.checked = this.engine.optimizeLabelPlacement;
      this.optimizeLabelPlacement_CheckBox.toolTip = "<p>Apply a label placement optimization "
         + "algorithm to remove overlappings and conflicts among graphics elements in the "
         + "annotation, with a minimum distance maximization local optimization criterion. When "
         + "this option is selected, label text positions specified for each selected layer will "
         + "be used as a first default option, but the algorithm will move labels as necessary "
         + "to fulfill its optimization goals.</p>"
         + "<p>Excessively crowded annotations, where overlappings cannot be avoided, will be "
         + "simplified by removing elements as strictly necessary.</p>";
      this.optimizeLabelPlacement_CheckBox.onCheck = function( checked )
      {
         this.dialog.engine.optimizeLabelPlacement = checked;
      };

      this.optimizeLabelPlacement_Sizer = new HorizontalSizer;
      this.optimizeLabelPlacement_Sizer.spacing = 4;
      this.optimizeLabelPlacement_Sizer.addUnscaledSpacing( this.labelWidth1 + ui4 );
      this.optimizeLabelPlacement_Sizer.add( this.optimizeLabelPlacement_CheckBox );
      this.optimizeLabelPlacement_Sizer.addStretch();

      //

      this.dropShadow_CheckBox = new CheckBox( this );
      this.dropShadow_CheckBox.text = "Drop shadow:";
      this.dropShadow_CheckBox.checked = this.engine.dropShadow;
      this.dropShadow_CheckBox.toolTip = "<p>Generate a drop shadow effect for the entire "
         + "annotation. This can be useful to improve readability of markers and labels over "
         + "bright areas of the image, such as extended nebulae and bright stars.</p>";
      this.dropShadow_CheckBox.onCheck = function( checked )
      {
         this.dialog.engine.dropShadow = checked;
         this.dialog.shadowOffset_SpinBox.enabled = checked;
         this.dialog.verticalShadow_CheckBox.enabled = checked;
      };

      this.shadowOffset_SpinBox = new SpinBox( this );
      this.shadowOffset_SpinBox.toolTip = "<p>Drop shadow offset in pixels.</p>";
      this.shadowOffset_SpinBox.setRange( 1, 8 );
      this.shadowOffset_SpinBox.value = this.engine.shadowOffset;
      this.shadowOffset_SpinBox.enabled = this.engine.dropShadow;
      this.shadowOffset_SpinBox.onValueUpdated = function( value )
      {
         this.dialog.engine.shadowOffset = value;
      };

      this.verticalShadow_CheckBox = new CheckBox( this );
      this.verticalShadow_CheckBox.text = "Vertical";
      this.verticalShadow_CheckBox.checked = this.engine.verticalShadow;
      this.verticalShadow_CheckBox.enabled = this.engine.dropShadow;
      this.verticalShadow_CheckBox.toolTip = "<p>If vertical shadow is enabled, the drop "
         + "shadow simulates light coming from the zenith. If disabled, the drop shadow "
         + "is offset by the specified number of pixels. </p>";
      this.verticalShadow_CheckBox.onCheck = function( checked )
      {
         this.dialog.engine.verticalShadow = checked;
      };

      this.dropShadow_Sizer = new HorizontalSizer;
      this.dropShadow_Sizer.spacing = 4;
      this.dropShadow_Sizer.addUnscaledSpacing( this.labelWidth1 + ui4 );
      this.dropShadow_Sizer.add( this.dropShadow_CheckBox );
      this.dropShadow_Sizer.add( this.shadowOffset_SpinBox );
      this.dropShadow_Sizer.add( this.verticalShadow_CheckBox );
      this.dropShadow_Sizer.addStretch();

      //

      this.writeObjectsToFile_CheckBox = new CheckBox( this );
      this.writeObjectsToFile_CheckBox.text = "Write objects to a text file";
      this.writeObjectsToFile_CheckBox.toolTip = "<p>If enabled, the script will write "
         + "a text file with all catalog objects inside the image.</p>"
         + "<p>If the image has been loaded from an existing file, the output text file "
         + "will be created on the same directory and with the same file name, but with "
         + "the suffix '.objects.txt'.</p>"
         + "<p>If the image has not been loaded from a file, the script will ask for a "
         + "file path using a standard file dialog.</p>";
      this.writeObjectsToFile_CheckBox.checked = ("writeObjects" in this.engine) ? this.engine.writeObjects : false;
      this.writeObjectsToFile_CheckBox.onCheck = function( checked )
      {
         this.dialog.engine.writeObjects = checked;
      };

      this.writeObjectsToFile_Sizer = new HorizontalSizer;
      this.writeObjectsToFile_Sizer.spacing = 4;
      this.writeObjectsToFile_Sizer.addUnscaledSpacing( this.labelWidth1 + ui4 );
      this.writeObjectsToFile_Sizer.add( this.writeObjectsToFile_CheckBox );
      this.writeObjectsToFile_Sizer.addStretch();

      //

      this.textScale_NumericControl = new NumericControl( this );
      this.textScale_NumericControl.real = true;
      this.textScale_NumericControl.label.text = "Text scale:";
      this.textScale_NumericControl.label.minWidth = this.labelWidth1;
      this.textScale_NumericControl.setRange( 1, 5 );
      this.textScale_NumericControl.slider.setRange( 0, 50 );
      this.textScale_NumericControl.slider.scaledMinWidth = 250;
      this.textScale_NumericControl.setPrecision( 1 );
      this.textScale_NumericControl.edit.minWidth = this.editWidth;
      this.textScale_NumericControl.setValue( this.engine.textScale );
      this.textScale_NumericControl.toolTip = "<p>Scaling factor used to draw text "
         + "elements on the annotated image.</p>"
         + "<p>This parameter defines the resolution in pixels per typographic point "
         + "applied to render text on the annotation. A text scale of 1.0 corresponds "
         + "to a resolution of 72 pixels per inch, or approximately 28.35 pixels per "
         + "centimeter. The default text scale is 2.0, corresponding to a text "
         + "resolution of 144 dpi, which is appropriate in most cases.</p>";
      this.textScale_NumericControl.onValueUpdated = function( value )
      {
         this.dialog.engine.textScale = value;
      };

      this.textScale_Sizer = new HorizontalSizer;
      this.textScale_Sizer.spacing = 4;
      this.textScale_Sizer.add( this.textScale_NumericControl );
      this.textScale_Sizer.addStretch();

      //

      this.graphicsScale_NumericControl = new NumericControl( this );
      this.graphicsScale_NumericControl.real = true;
      this.graphicsScale_NumericControl.label.text = "Graphics scale:";
      this.graphicsScale_NumericControl.label.minWidth = this.labelWidth1;
      this.graphicsScale_NumericControl.setRange( 0.1, 5 );
      this.graphicsScale_NumericControl.slider.setRange( 0, 49 );
      this.graphicsScale_NumericControl.slider.scaledMinWidth = 250;
      this.graphicsScale_NumericControl.setPrecision( 1 );
      this.graphicsScale_NumericControl.edit.minWidth = this.editWidth;
      this.graphicsScale_NumericControl.setValue( this.engine.graphicsScale );
      this.graphicsScale_NumericControl.toolTip = "<p>Scaling factor used when drawing "
         + "graphical elements on the image.</p>"
         + "<p>This parameter is useful to change the size of all elements of the image "
         + "annotation as a whole.</p>";
      this.graphicsScale_NumericControl.onValueUpdated = function( value )
      {
         this.dialog.engine.graphicsScale = value;
      };

      this.graphicsScale_Sizer = new HorizontalSizer;
      this.graphicsScale_Sizer.spacing = 4;
      this.graphicsScale_Sizer.add( this.graphicsScale_NumericControl );
      this.graphicsScale_Sizer.addStretch();

      //

      this.smallSizeThreshold_NumericControl = new NumericControl( this );
      this.smallSizeThreshold_NumericControl.real = true;
      this.smallSizeThreshold_NumericControl.label.text = "Small size threshold:";
      this.smallSizeThreshold_NumericControl.label.minWidth = this.labelWidth1;
      this.smallSizeThreshold_NumericControl.setRange( 0, 25 );
      this.smallSizeThreshold_NumericControl.slider.setRange( 0, 50 );
      this.smallSizeThreshold_NumericControl.slider.scaledMinWidth = 250;
      this.smallSizeThreshold_NumericControl.setPrecision( 1 );
      this.smallSizeThreshold_NumericControl.edit.minWidth = this.editWidth;
      this.smallSizeThreshold_NumericControl.setValue( this.engine.smallSizeThreshold );
      this.smallSizeThreshold_NumericControl.toolTip = "<p>Representations of small objects "
         + "can be enlarged artificially to make them more visible in the annotated image. "
         + "This parameter is the radius in pixels of the largest elliptical annotations to "
         + "which these artificial enlargement factors will be applied. Enlargement functions "
         + "are logarithmic to achieve a smooth zooming effect without visible discontinuities.</p>"
         + "<p>The default value is 12 pixels. Set this parameter to zero to disable this "
         + "feature and represent all objects with their (known) actual angular dimensions.</p>";
      this.smallSizeThreshold_NumericControl.onValueUpdated = function( value )
      {
         this.dialog.engine.smallSizeThreshold = value;
      };

      this.smallSizeThreshold_Sizer = new HorizontalSizer;
      this.smallSizeThreshold_Sizer.spacing = 4;
      this.smallSizeThreshold_Sizer.add( this.smallSizeThreshold_NumericControl );
      this.smallSizeThreshold_Sizer.addStretch();

      //

      this.generalProperties_Control = new Control( this );
      this.generalProperties_Control.sizer = new VerticalSizer;
      this.generalProperties_Control.sizer.spacing = 4;
      this.generalProperties_Control.sizer.add( this.outputSizer );
      this.generalProperties_Control.sizer.add( this.vizierServer_Sizer );
      this.generalProperties_Control.sizer.add( this.removeDuplicates_Sizer );
      this.generalProperties_Control.sizer.add( this.optimizeLabelPlacement_Sizer );
      this.generalProperties_Control.sizer.add( this.dropShadow_Sizer );
      this.generalProperties_Control.sizer.add( this.writeObjectsToFile_Sizer );
      this.generalProperties_Control.sizer.add( this.textScale_Sizer );
      this.generalProperties_Control.sizer.add( this.graphicsScale_Sizer );
      this.generalProperties_Control.sizer.add( this.smallSizeThreshold_Sizer );

      this.generalProperties_Section = new SectionBar( this, "General Properties" );
      this.generalProperties_Section.setSection( this.generalProperties_Control );
      this.generalProperties_Section.onToggleSection = toggleSectionHandler;

      // ----------------------------------------------------------------------
      // Observation
      // ----------------------------------------------------------------------

      this.observationTime_Label = new Label( this );
      this.observationTime_Label.text = "Date and time:";
      this.observationTime_Label.toolTip = "<p>Date and time of observation in the UTC timescale.</p>";
      this.observationTime_Label.textAlignment = TextAlignment.Right|TextAlignment.VertCenter;
      this.observationTime_Label.setFixedWidth( this.labelWidth1 );

      this.observationTime_Y_SpinBox = new SpinBox( this );
      this.observationTime_Y_SpinBox.toolTip = "<p>UTC date of observation, year.</p>";
      this.observationTime_Y_SpinBox.setRange( -5000, +5000 );
      this.observationTime_Y_SpinBox.setFixedWidth( editWidth2 );

      this.observationTime_Y_Label = new Label( this );
      this.observationTime_Y_Label.text = "Y";
      this.observationTime_Y_Label.setFixedWidth( labelWidth3 );

      this.observationTime_N_SpinBox = new SpinBox( this );
      this.observationTime_N_SpinBox.toolTip = "<p>UTC date of observation, month.</p>";
      this.observationTime_N_SpinBox.setRange( 1, 12 );
      this.observationTime_N_SpinBox.setFixedWidth( editWidth1 );

      this.observationTime_N_Label = new Label( this );
      this.observationTime_N_Label.text = "M";
      this.observationTime_N_Label.setFixedWidth( labelWidth3 );

      this.observationTime_D_SpinBox = new SpinBox( this );
      this.observationTime_D_SpinBox.toolTip = "<p>UTC date of observation, day.</p>";
      this.observationTime_D_SpinBox.setRange( 0, 31 );
      this.observationTime_D_SpinBox.setFixedWidth( editWidth1 );

      this.observationTime_D_Label = new Label( this );
      this.observationTime_D_Label.text = "d";
      this.observationTime_D_Label.setFixedWidth( labelWidth3 );

      this.observationTime_H_SpinBox = new SpinBox( this );
      this.observationTime_H_SpinBox.toolTip = "<p>UTC time of observation, hour.</p>";
      this.observationTime_H_SpinBox.setRange( 0, 23 );
      this.observationTime_H_SpinBox.setFixedWidth( editWidth1 );

      this.observationTime_H_Label = new Label( this );
      this.observationTime_H_Label.text = "h";
      this.observationTime_H_Label.setFixedWidth( labelWidth3 );

      this.observationTime_M_SpinBox = new SpinBox( this );
      this.observationTime_M_SpinBox.toolTip = "<p>UTC time of observation, minute.</p>";
      this.observationTime_M_SpinBox.setRange( 0, 59 );
      this.observationTime_M_SpinBox.setFixedWidth( editWidth1 );

      this.observationTime_M_Label = new Label( this );
      this.observationTime_M_Label.text = "m";
      this.observationTime_M_Label.setFixedWidth( labelWidth3 );

      this.observationTime_S_SpinBox = new SpinBox( this );
      this.observationTime_S_SpinBox.toolTip = "<p>UTC time of observation, seconds.</p>";
      this.observationTime_S_SpinBox.setRange( 0, 59 );
      this.observationTime_S_SpinBox.setFixedWidth( editWidth1 );

      this.observationTime_S_Label = new Label( this );
      this.observationTime_S_Label.text = "s";
      this.observationTime_S_Label.setFixedWidth( labelWidth3 );

      this.observationTime_Sizer = new HorizontalSizer;
      this.observationTime_Sizer.spacing = 4;
      this.observationTime_Sizer.add( this.observationTime_Label );
      this.observationTime_Sizer.add( this.observationTime_Y_SpinBox );
      this.observationTime_Sizer.add( this.observationTime_Y_Label );
      this.observationTime_Sizer.add( this.observationTime_N_SpinBox );
      this.observationTime_Sizer.add( this.observationTime_N_Label );
      this.observationTime_Sizer.add( this.observationTime_D_SpinBox );
      this.observationTime_Sizer.add( this.observationTime_D_Label );
      this.observationTime_Sizer.add( this.observationTime_H_SpinBox );
      this.observationTime_Sizer.add( this.observationTime_H_Label );
      this.observationTime_Sizer.add( this.observationTime_M_SpinBox );
      this.observationTime_Sizer.add( this.observationTime_M_Label );
      this.observationTime_Sizer.add( this.observationTime_S_SpinBox );
      this.observationTime_Sizer.add( this.observationTime_S_Label );
      this.observationTime_Sizer.addStretch();

      //

      this.topocentric_CheckBox = new CheckBox( this );
      this.topocentric_CheckBox.text = "Topocentric";
      this.topocentric_CheckBox.toolTip = "<p>Compute topocentric positions of solar system objects.</p>"
         + "<p>If this option is enabled, positions calculated for planets, asteroids and comets "
         + "will be topocentric, that is, will be referred to the location of the observer with "
         + "respect to the center of the Earth, as defined by the following geodetic longitude, "
         + "latitude, and height parameters.</p>"
         + "<p>If this option is disabled, the computed positions will be geocentric, which will "
         + "lead to inaccurate annotations, especially for objects relatively close to the Earth at "
         + "the date of observation.</p>";
      this.topocentric_CheckBox.onCheck = function( checked )
      {
         this.dialog.engine.topocentric = checked;
         this.dialog.observerData_Control.enabled = checked;
      };

      this.topocentric_Sizer = new HorizontalSizer;
      this.topocentric_Sizer.addUnscaledSpacing( this.labelWidth1 + ui4 );
      this.topocentric_Sizer.add( this.topocentric_CheckBox );
      this.topocentric_Sizer.addStretch();

      //

      this.observerData_Control = new GeodeticCoordinatesEditor( this,
                                                                 this.engine.obsLongitude,
                                                                 this.engine.obsLatitude,
                                                                 this.engine.obsHeight,
                                                                 this.labelWidth1,
                                                                 editWidth1 );
      this.observerData_Control.enabled = this.engine.topocentric;

      //

      this.observation_Control = new Control( this );
      this.observation_Control.sizer = new VerticalSizer;
      this.observation_Control.sizer.spacing = 4;
      this.observation_Control.sizer.add( this.observationTime_Sizer );
      this.observation_Control.sizer.add( this.topocentric_Sizer );
      this.observation_Control.sizer.add( this.observerData_Control );

      this.observation_Section = new SectionBar( this, "Observation" );
      this.observation_Section.setSection( this.observation_Control );
      this.observation_Section.onToggleSection = toggleSectionHandler;

      // ----------------------------------------------------------------------
      // Buttons
      // ----------------------------------------------------------------------

      this.newInstance_Button = new ToolButton( this );
      this.newInstance_Button.icon = this.scaledResource( ":/process-interface/new-instance.png" );
      this.newInstance_Button.setScaledFixedSize( 24, 24 );
      this.newInstance_Button.toolTip = "New Instance";
      this.newInstance_Button.onMousePress = function()
      {
         this.hasFocus = true;
         this.pushed = false;
         this.dialog.updateEngineProperties();
         this.dialog.engine.SaveParameters();
         this.dialog.newInstance();
      };

      this.reset_Button = new ToolButton( this );
      this.reset_Button.icon = this.scaledResource( ":/icons/reload.png" );
      this.reset_Button.setScaledFixedSize( 24, 24 );
      this.reset_Button.toolTip = "<p>Resets all script parameters to factory-default values.</p>";
      this.reset_Button.onClick = function()
      {
         let msg = new MessageBox( "<p>Do you really want to reset all script parameters to default values?</p>",
                                   TITLE, StdIcon.Warning, StdButton.Yes, StdButton.No );
         if ( msg.execute() == StdButton.Yes )
         {
            this.dialog.engine.ResetSettings();
            this.dialog.resetRequest = true;
            this.dialog.cancel();
         }
      };

      this.preview_Button = new ToolButton( this );
      this.preview_Button.text = "Preview";
      this.preview_Button.icon = this.scaledResource( ":/icons/find.png" );
      this.preview_Button.toolTip = "<p>Preview the annotation on a dedicated interactive interface.</p>";
      this.preview_Button.onClick = function()
      {
         this.dialog.updateEngineProperties();
         (new AnnotateDialog.PreviewDialog( this.dialog,
                                            this.dialog.engine.RenderPreview(),
                                            this.dialog.engine.metadata )).execute();
      };

      this.ok_Button = new PushButton( this );
      this.ok_Button.defaultButton = true;
      this.ok_Button.text = "OK";
      this.ok_Button.icon = this.scaledResource( ":/icons/ok.png" );
      this.ok_Button.onClick = function()
      {
         if ( this.dialog.validate() )
         {
            this.dialog.updateEngineProperties();
            this.dialog.ok();
         }
      };

      this.cancel_Button = new PushButton( this );
      this.cancel_Button.text = "Cancel";
      this.cancel_Button.icon = this.scaledResource( ":/icons/cancel.png" );
      this.cancel_Button.onClick = function()
      {
         this.dialog.cancel();
      };

      this.buttons_Sizer = new HorizontalSizer;
      this.buttons_Sizer.spacing = 6;
      this.buttons_Sizer.add( this.newInstance_Button );
      this.buttons_Sizer.add( this.reset_Button );
      this.buttons_Sizer.add( this.preview_Button );
      this.buttons_Sizer.addStretch();
      this.buttons_Sizer.add( this.ok_Button );
      this.buttons_Sizer.add( this.cancel_Button );

      // ----------------------------------------------------------------------
      // Global sizer
      // ----------------------------------------------------------------------

      this.sizer = new VerticalSizer;
      this.sizer.margin = 8;
      this.sizer.spacing = 6;
      this.sizer.add( this.information_Label );
      this.sizer.addSpacing( 4 );
      this.sizer.add( this.layers_Section );
      this.sizer.add( this.layers_Control, 100 );
      this.sizer.add( this.layerParameters_Section );
      this.sizer.add( this.layerParameters_Control );
      this.sizer.add( this.generalProperties_Section );
      this.sizer.add( this.generalProperties_Control );
      this.sizer.add( this.observation_Section );
      this.sizer.add( this.observation_Control );
      this.sizer.addSpacing( 4 );
      this.sizer.add( this.buttons_Sizer );

      this.windowTitle = TITLE;

      this.layers_TreeBox.currentNode = this.layers_TreeBox.child( 0 );
      this.activateLayer( this.layers_TreeBox.child( 0 ) );

      this.ensureLayoutUpdated();
      this.adjustToContents();
      this.setFixedWidth();

      this.updateObservationTime();
      this.updateObserverPosition();
   }

   // -------------------------------------------------------------------------

   activateLayer( node )
   {
      this.layers_Control.setFixedHeight();

      if ( this.dialog.activeFrame )
      {
         this.dialog.layerParameters_Control.sizer.remove( this.dialog.activeFrame );
         this.dialog.activeFrame.visible = false;
      }

      if ( node )
      {
         this.dialog.layerParameters_Control.sizer.add( node.frame );
         this.dialog.layerParameters_Control.ensureLayoutUpdated();
         this.dialog.activeFrame = node.frame;
         this.dialog.activeFrame.visible = true;
         this.dialog.layerParameters_Section.setTitle( node.text( 0 ) + " Parameters" );
      }

      this.dialog.ensureLayoutUpdated();
      this.dialog.adjustToContents();
      this.layers_Control.setVariableHeight();
   }

   addLayerToTree( layer, index )
   {

      let node = new TreeBoxNode( this.layers_TreeBox, index ?? this.layers_TreeBox.numberOfChildren );
      node.checkable = true;
      node.checked = layer.visible;
      node.setText( 0, layer.layerName );
      node.setIcon( 1, this.scaledResource( layer.gprops.showMarkers ? ":/browser/enabled.png" : ":/browser/disabled.png" ) );
      node.setToolTip( 1, "<p>Show markers</p>" );
      node.setIcon( 2, this.scaledResource( layer.gprops.showLabels ? ":/browser/enabled.png" : ":/browser/disabled.png" ) );
      node.setToolTip( 2, "<p>Show labels</p>" );
      node.setText( 3, layer.layerDescription );
      node.setToolTip( 3, "<p>" + layer.layerDescription + "</p>" );

      node.frame = layer.GetEditPanel( this );
      node.frame.visible = false;

      this.layers_TreeBox.adjustColumnWidthToContents( 0 );
      this.layers_TreeBox.adjustColumnWidthToContents( 1 );
      this.layers_TreeBox.adjustColumnWidthToContents( 2 );

      return node;
   }

   // -------------------------------------------------------------------------

   observationTime()
   {
      return Math.calendarTimeToJD( this.observationTime_Y_SpinBox.value,
                                    this.observationTime_N_SpinBox.value,
                                    this.observationTime_D_SpinBox.value,
                                   (this.observationTime_H_SpinBox.value
                                       + (this.observationTime_M_SpinBox.value
                                          + this.observationTime_S_SpinBox.value/60)/60)/24 );
   }

   updateObservationTime()
   {
      let jd = this.engine.observationTime;
      if ( !jd )
         jd = this.engine.observationTime =
               this.engine.metadata.observationTime =
                  this.engine.metadata.startTime = 2451545.0;
      let A = Math.jdToCalendarTime( jd );
      let hh = A[3]*24;
      let mm = Math.frac( hh )*60;
      let ss = Math.round( Math.frac( mm )*60 );
      mm = Math.trunc( mm );
      hh = Math.trunc( hh );
      if ( ss == 60 )
      {
         ss = 0;
         mm += 1;
      }
      if ( mm == 60 )
      {
         mm = 0;
         hh += 1;
      }
      if ( hh == 24 )
      {
         this.setObservationTime( Math.calendarTimeToJD( A[0], A[1], A[2]+1, (mm + ss/60)/1440 ) );
         return;
      }
      this.observationTime_Y_SpinBox.value = A[0];
      this.observationTime_N_SpinBox.value = A[1];
      this.observationTime_D_SpinBox.value = A[2];
      this.observationTime_H_SpinBox.value = hh;
      this.observationTime_M_SpinBox.value = mm;
      this.observationTime_S_SpinBox.value = ss;
   }

   updateObserverPosition()
   {
      this.topocentric_CheckBox.checked = this.engine.topocentric;
      this.observerData_Control.enabled = this.engine.topocentric;
      this.observerData_Control.longitude = this.engine.obsLongitude;
      this.observerData_Control.latitude = this.engine.obsLatitude;
      this.observerData_Control.altitude = this.engine.obsHeight;
   }

   updateEngineProperties()
   {
      this.engine.layers = new Array();
      for ( let i = 0; i < this.layers_TreeBox.numberOfChildren; ++i )
      {
         let node = this.layers_TreeBox.child( i );
         node.frame.object.visible = node.checked;
         if ( node.frame.object.Validate && !node.frame.object.Validate() )
         {
            this.layers_TreeBox.currentNode = node;
            this.activateLayer( node );
            return;
         }
         this.engine.layers.push( node.frame.object );
      }

      this.engine.observationTime =
         this.engine.metadata.observationTime =
            this.engine.metadata.startTime = this.observationTime();
      this.engine.topocentric = this.topocentric_CheckBox.checked;
      this.engine.obsLongitude = this.observerData_Control.longitude;
      this.engine.obsLatitude = this.observerData_Control.latitude;
      this.engine.obsHeight = this.observerData_Control.altitude;
      return true;
   }

   validate()
   {
      if ( this.engine.outputMode == AnnotationEngine.OutputMode.SVG )
         if ( typeof( this.engine.svgPath ) != "string" || this.engine.svgPath.trim().isEmpty() )
         {
            (new MessageBox( "<p>No SVG file path has been defined, which is required for the SVG output mode.</p>",
                             TITLE, StdIcon.Error, StdButton.Ok )).execute();
            return false;
         }
      return true;
   }
};

// ----------------------------------------------------------------------------
// EOF AnnotateImageDialog.js - Released 2026-05-11T18:30:06Z
