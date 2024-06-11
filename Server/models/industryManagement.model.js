var mongoose = require('mongoose');
var Schema = mongoose.Schema;
// Industry Advance Schema
var IndustrySchema = mongoose.Schema({    
    Industry_Name:  {type: String },
    Status: { type: String },
    User: { type: Schema.Types.ObjectId, ref:'User'},    
    Active_Status: { type: Boolean},
    If_Deleted: { type: Boolean}
},
    { timestamps: true }
);


var VarIndustrySchema = mongoose.model('Industry', IndustrySchema, 'IndustryManagement');

module.exports = {
    IndustrySchema: VarIndustrySchema
};