const
    _ = require('lodash'),
    mongoose = require('mongoose');

module.exports = function mongoosePopulateHelper(schema, configs) {
    _.each(configs, function (config) {
        config.targetModel = config.targetModel ? mongoose.modelSchemas[config.targetModel] : schema;

        const newField = {
            [config.targetField.name]: _.omit(config.targetField, 'name')
        };

        schema.add(newField);

        schema.post('save', function (document, done) {
            async.waterfall([
                selectSourceField,
                populateSourceField,
                assignTargetField
            ], done);

            function selectSourceField(next) {
                if (!_.isNil(document[config.sourceField]))
                    return next(null, document);

                document.constructor
                    .findById(document.id)
                    .select(
                        [config.sourceField]
                            .concat(Object.keys(document.toObject()))
                            .join(' ')
                    )
                    .exec(next);
            }

            function populateSourceField(document, next) {
                if (document === null)
                    return done();

                if (!(document[config.sourceField] instanceof mongoose.Types.ObjectId))
                    return next(null, document);

                document.populate(config.sourceField, next)
            }

            function assignTargetField(document, next) {
                if (document[config.sourceField] === null)
                    return done();

                document[config.targetField.name] = config.map ? config.map(document[config.sourceField]) : document[config.sourceField];

                document.collection
                    .update({ _id: document._id }, { $set: { [config.targetField.name]: document[config.targetField.name] } })
                    .then(() => next())
                    .catch(next);
            }
        });
    });
}