var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var CountrySchema = mongoose.Schema({
    Continent_GeoNameId: { type : Number },
    Country_GeoNameId: { type : Number },
    Country_Code: { type : String },
    Country_Name: { type : String },
    Country_Lat: { type : String },
    Country_Lng: { type : String },
 });
 
 var StateSchema = mongoose.Schema({
    State_GeoNameId: { type : Number },
    State_Name: { type : String },
    State_Lat: { type : String },
    State_Lng: { type : String },
    Country_GeoNameId: { type : Number },
    Country_DatabaseId: { type: Schema.Types.ObjectId, ref: 'Global_Country' },
 });
 
 var CitySchema = mongoose.Schema({
    City_GeoNameId: { type : Number },
    City_Name: { type : String },
    City_Lat: { type : String },
    City_Lng: { type : String },
    Country_GeoNameId: { type : Number },
    State_GeoNameId: { type : Number },
    Country_DatabaseId: [{ type: Schema.Types.ObjectId, ref: 'Global_Country' }],
    State_DatabaseId: [{ type: Schema.Types.ObjectId, ref: 'Global_State' }],
 });

var VarGlobal_Country = mongoose.model('Global_Country', CountrySchema, 'Global_Country');
var VarGlobal_State = mongoose.model('Global_State', StateSchema, 'Global_State');
var VarGlobal_City = mongoose.model('Global_City', CitySchema, 'Global_City');

module.exports = { 
    Global_Country : VarGlobal_Country,
    Global_State : VarGlobal_State,
    Global_City : VarGlobal_City    
 };
