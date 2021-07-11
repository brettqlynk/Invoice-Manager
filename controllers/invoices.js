const router = require('express').Router();
const jwt = require('jsonwebtoken');
const Invoice = require('../models/invoice');
const User = require('../models/user');

router.get('/', async (request, response) => {
  const invoices = await Invoice.find({}).populate('user', {
    username: 1,
    name: 1,
  });
  response.json(invoices);
});

router.post('/', async (request, response) => {
  const invoice = new Invoice(request.body);

  const decodedToken = jwt.verify(request.token, process.env.SECRET);

  if (!request.token || !decodedToken.id) {
    return response.status(401).json({ error: 'token missing or invalid' });
  }

  const user = await User.findById(decodedToken.id);

  invoice.user = user;
  const savedInvoice = await invoice.save();

  user.invoices = user.invoices.concat(savedInvoice._id);
  await user.save();

  response.status(201).json(savedInvoice);
});

router.put('/:id', async (request, response) => {
  const invoice = request.body;

  const updatedInvoice = await Invoice.findByIdAndUpdate(
    request.params.id,
    invoice,
    {
      new: true,
    }
  );

  response.json(updatedInvoice.toJSON());
});

router.delete('/:id', async (request, response) => {
  const decodedToken = jwt.verify(request.token, process.env.SECRET);

  if (!request.token || !decodedToken.id) {
    return response.status(401).json({ error: 'token missing or invalid' });
  }

  const user = await User.findById(decodedToken.id);
  const invoice = await Invoice.findById(request.params.id);
  if (invoice.user.toString() !== user.id.toString()) {
    return response
      .status(401)
      .json({ error: 'only the creator can delete invoices' });
  }

  await invoice.remove();
  user.invoices = user.invoices.filter(
    (b) => b.id.toString() !== request.params.id.toString()
  );
  await user.save();
  response.status(204).end();
});


module.exports = router;
